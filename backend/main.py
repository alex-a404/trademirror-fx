"""
TradeMirror — FastAPI backend
First version: parsing + analysis only. Bedrock layer comes next.
"""

import uuid
from typing import List

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from computation import compute_metrics
from models import ClientAnalysis
from parser import parse_mt5_report
from routing import (
    build_behavioral_groups,
    compute_population_statistics,
    get_client_signals,
)
from session_store import create_session, get_session, session_exists

app = FastAPI(title="TradeMirror API", version="0.1.0")

# Allow all origins during development — tighten before production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
# Startup — pre-load demo session
# ──────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    """Load the synthetic demo dataset on startup so /demo endpoints work immediately."""
    import os, glob

    demo_dir = os.path.join(os.path.dirname(__file__), "data", "synthetic")
    if not os.path.exists(demo_dir):
        print("[startup] No synthetic data directory found — skipping demo session load")
        return

    files = glob.glob(os.path.join(demo_dir, "*.txt"))
    if not files:
        print("[startup] No synthetic MT5 files found — skipping demo session load")
        return

    all_trades = {}
    for filepath in files:
        client_id = os.path.basename(filepath).replace(".txt", "")
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        try:
            all_trades[client_id] = parse_mt5_report(content, client_id)
        except Exception as e:
            print(f"[startup] Failed to parse {client_id}: {e}")

    if not all_trades:
        print("[startup] No trades parsed from synthetic files")
        return

    session_data = _build_broker_session(all_trades)
    create_session("demo", session_data)
    print(f"[startup] Demo session loaded: {list(all_trades.keys())}")


# ──────────────────────────────────────────────
# Client-side endpoint
# ──────────────────────────────────────────────

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    """
    Parse a single MT5 report and return full behavioral analysis.
    Narrative and autopsy cards are empty until Bedrock is wired in.
    """
    raw = await file.read()
    try:
        content = raw.decode("utf-8")
    except UnicodeDecodeError:
        content = raw.decode("latin-1")

    client_id = file.filename.rsplit(".", 1)[0] if file.filename else "client"

    try:
        trades = parse_mt5_report(content, client_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Parse error: {e}")

    if not trades:
        raise HTTPException(status_code=400, detail="No closed positions found in file")

    metrics = compute_metrics(trades)

    analysis = ClientAnalysis(
        client_id=client_id,
        trades=trades,
        metrics=metrics,
        narrative="",         # TODO: Bedrock
        autopsy_cards={},     # TODO: Bedrock
    )

    return analysis.to_dict()


# ──────────────────────────────────────────────
# Broker-side endpoints
# ──────────────────────────────────────────────

@app.post("/broker/upload")
async def broker_upload(files: List[UploadFile] = File(...)):
    """
    Accept multiple MT5 files (one per client).
    Filename (without extension) is used as client_id.
    Returns a session_id for subsequent GET requests.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    all_trades = {}
    errors = []

    for file in files:
        raw = await file.read()
        try:
            content = raw.decode("utf-8")
        except UnicodeDecodeError:
            content = raw.decode("latin-1")

        client_id = file.filename.rsplit(".", 1)[0] if file.filename else f"client_{len(all_trades)}"

        try:
            trades = parse_mt5_report(content, client_id)
            all_trades[client_id] = trades
        except Exception as e:
            errors.append({"client_id": client_id, "error": str(e)})

    if not all_trades:
        raise HTTPException(status_code=400, detail=f"No files parsed successfully. Errors: {errors}")

    session_data = _build_broker_session(all_trades)
    session_data["parse_errors"] = errors

    session_id = str(uuid.uuid4())
    create_session(session_id, session_data)

    return {
        "session_id": session_id,
        "clients_processed": len(all_trades),
        "parse_errors": errors,
    }


@app.get("/broker/session/{session_id}")
async def broker_session(session_id: str):
    """Full broker results: groups + client signals + excluded clients."""
    data = _get_session_or_404(session_id)
    return _serialize_broker_session(data)


@app.get("/broker/groups/{session_id}")
async def broker_groups(session_id: str):
    """Behavioral groups only — for the groups tab."""
    data = _get_session_or_404(session_id)
    return {"groups": [g.to_dict() for g in data["groups"]]}


@app.get("/broker/clients/{session_id}")
async def broker_clients(session_id: str):
    """Client list with primary signals — for the client list tab."""
    data = _get_session_or_404(session_id)
    return {
        "clients": data["client_signals"],
        "no_signal_clients": data["no_signal_clients"],
        "excluded_clients": data["excluded_clients"],
    }


@app.get("/broker/client/{session_id}/{client_id}")
async def broker_client(session_id: str, client_id: str):
    """Individual client drill-down. Returns same shape as /analyze."""
    data = _get_session_or_404(session_id)
    analyses = data["analyses"]
    if client_id not in analyses:
        raise HTTPException(status_code=404, detail=f"Client '{client_id}' not found in session")
    return analyses[client_id].to_dict()


@app.get("/broker/export/{session_id}/{dimension}")
async def broker_export(session_id: str, dimension: str):
    """
    Export client list + campaign copy for a given behavioral dimension.
    Returns JSON with client_ids list and campaign_text string.
    """
    data = _get_session_or_404(session_id)
    groups = data["groups"]

    target = next((g for g in groups if g.dimension == dimension), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"No group found for dimension '{dimension}'")

    campaign_text = "\n\n".join([
        f"EMAIL SUBJECT: {target.campaign_email_subject}",
        f"EMAIL BODY:\n{target.campaign_email_body}",
        f"IN-APP NOTIFICATION: {target.campaign_notification}",
        f"TALKING POINTS:\n{target.campaign_talking_points}",
    ])

    return {
        "dimension": dimension,
        "display_name": target.display_name,
        "client_ids": target.client_ids,
        "campaign_text": campaign_text,
    }


# ──────────────────────────────────────────────
# Demo shortcuts — always use pre-loaded session
# ──────────────────────────────────────────────

@app.get("/demo/broker")
async def demo_broker():
    """Return pre-loaded demo broker session. No upload needed."""
    return _serialize_broker_session(_get_session_or_404("demo"))


@app.get("/demo/client/{client_id}")
async def demo_client(client_id: str):
    """Return pre-loaded individual client analysis."""
    data = _get_session_or_404("demo")
    if client_id not in data["analyses"]:
        raise HTTPException(status_code=404, detail=f"Client '{client_id}' not found in demo session")
    return data["analyses"][client_id].to_dict()


@app.get("/demo/clients")
async def demo_clients():
    """List available client IDs in the demo session."""
    data = _get_session_or_404("demo")
    return {"client_ids": list(data["analyses"].keys())}


# ──────────────────────────────────────────────
# Health check
# ──────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "demo_loaded": session_exists("demo")}


# ──────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────

def _build_broker_session(all_trades: dict) -> dict:
    """
    Run the full broker-side pipeline on a dict of {client_id: List[Trade]}.
    Returns a session data dict ready for session_store.
    """
    # Compute metrics per client
    client_metrics = {}
    client_analyses = {}

    for client_id, trades in all_trades.items():
        metrics = compute_metrics(trades)
        client_metrics[client_id] = metrics
        client_analyses[client_id] = ClientAnalysis(
            client_id=client_id,
            trades=trades,
            metrics=metrics,
            narrative="",       # TODO: Bedrock
            autopsy_cards={},   # TODO: Bedrock
        )

    # Population statistics — requires >= 3 sufficient-history clients
    sufficient = {cid: m for cid, m in client_metrics.items() if m.sufficient_history}

    if len(sufficient) < 3:
        # Not enough data for population stats — return minimal session
        return {
            "analyses": client_analyses,
            "pop_stats": {},
            "groups": [],
            "client_signals": {},
            "no_signal_clients": [],
            "excluded_clients": [cid for cid, m in client_metrics.items() if not m.sufficient_history],
        }

    pop_stats = compute_population_statistics(client_metrics)
    groups, no_signal, excluded = build_behavioral_groups(client_metrics, pop_stats)
    client_signals = get_client_signals(client_metrics, pop_stats)

    return {
        "analyses": client_analyses,
        "pop_stats": pop_stats,
        "groups": groups,
        "client_signals": client_signals,
        "no_signal_clients": no_signal,
        "excluded_clients": excluded,
    }


def _get_session_or_404(session_id: str) -> dict:
    try:
        return get_session(session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")


def _serialize_broker_session(data: dict) -> dict:
    return {
        "groups": [g.to_dict() for g in data["groups"]],
        "client_signals": data["client_signals"],
        "no_signal_clients": data["no_signal_clients"],
        "excluded_clients": data["excluded_clients"],
    }
