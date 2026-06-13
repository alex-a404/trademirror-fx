"""
TradeMirror — pre-generate all Bedrock responses for the demo dataset.

Run this ONCE before the demo. It calls Bedrock for every flagged trade,
every client narrative, and every behavioral group campaign, then writes
everything to data/bedrock_cache.json.

During the demo, main.py loads that cache at startup so all responses
are instant — no live Bedrock calls needed.

Usage:
    cp .env.example .env   # then edit .env
    pip install -r requirements.txt
    python pregenerate.py

Credentials live in backend/.env (see .env.example):
    OPENAI_API_KEY       — Bedrock API key (Console → Bedrock → API keys)
    AWS_DEFAULT_REGION   — e.g. eu-north-1
    OPENAI_BASE_URL      — optional; defaults from region
    BEDROCK_MODEL_ID     — optional; default deepseek.v3.2
"""

import glob
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))

from bedrock import (
    COURSE_META,
    generate_autopsy_card,
    generate_campaign,
    generate_narrative,
    load_cache,
    save_cache,
)
from computation import compute_metrics
from parser import parse_mt5_report
from routing import (
    DIMENSION_CONTENT_MAP,
    build_behavioral_groups,
    compute_population_statistics,
)

DEMO_DIR  = os.path.join(os.path.dirname(__file__), "data", "synthetic")
SLEEP_SEC = 0.5   # polite pause between Bedrock calls to avoid throttling


# ── Helpers ────────────────────────────────────────────────────────────────────

def rule(title: str = "") -> None:
    width = 60
    print(f"\n{'─' * width}")
    if title:
        print(f"  {title}")
        print(f"{'─' * width}")


def ok(msg: str) -> None:  print(f"  ✓  {msg}")
def warn(msg: str) -> None: print(f"  ⚠  {msg}")
def info(msg: str) -> None: print(f"     {msg}")


def courses_for(dimension: str) -> list[dict]:
    return [
        COURSE_META[cid]
        for cid in DIMENSION_CONTENT_MAP.get(dimension, [])
        if cid in COURSE_META
    ]


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    rule("TradeMirror — Bedrock pre-generation")

    # Load existing cache so we skip already-generated entries
    load_cache()

    # ── Parse MT5 files ────────────────────────────────────────────────────────

    rule("Parsing synthetic MT5 files")
    files = sorted(glob.glob(os.path.join(DEMO_DIR, "*.txt")))

    if not files:
        warn("No synthetic MT5 files found in data/synthetic/")
        warn("Run generate_synthetic_data.py first.")
        sys.exit(1)

    all_trades:  dict = {}
    all_metrics: dict = {}

    for filepath in files:
        client_id = os.path.basename(filepath).replace(".txt", "")
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        trades  = parse_mt5_report(content, client_id)
        metrics = compute_metrics(trades)
        all_trades[client_id]  = trades
        all_metrics[client_id] = metrics
        flagged = sum(1 for t in trades if t.flags)
        ok(f"{client_id}: {len(trades)} trades, {flagged} flagged")

    # ── 1. Autopsy cards ───────────────────────────────────────────────────────

    rule("Generating autopsy cards (flagged trades only)")
    total_flagged = 0

    for client_id, trades in all_trades.items():
        flagged_trades = [t for t in trades if t.flags]
        total_flagged += len(flagged_trades)

        if not flagged_trades:
            info(f"{client_id}: no flagged trades")
            continue

        print(f"\n  {client_id} — {len(flagged_trades)} flagged trades")
        for trade in flagged_trades:
            flags_str = ", ".join(
                f.value if hasattr(f, "value") else str(f)
                for f in trade.flags
            )
            card = generate_autopsy_card(trade)
            preview = card[:72].replace("\n", " ") if card else "(Bedrock unavailable)"
            print(f"    [{flags_str}] {preview}…")
            time.sleep(SLEEP_SEC)

    info(f"Total autopsy cards: {total_flagged}")

    # ── 2. Client narratives ───────────────────────────────────────────────────

    rule("Generating client narratives")
    for client_id in all_trades:
        narrative = generate_narrative(
            client_id,
            all_metrics[client_id],
            all_trades[client_id],
        )
        preview = narrative[:72].replace("\n", " ") if narrative else "(Bedrock unavailable)"
        ok(f"{client_id}: {preview}…")
        time.sleep(SLEEP_SEC)

    # ── 3. Campaign content ────────────────────────────────────────────────────

    rule("Generating campaign content per behavioral group")
    sufficient = {cid: m for cid, m in all_metrics.items() if m.sufficient_history}

    if len(sufficient) < 3:
        warn(f"Only {len(sufficient)} clients with sufficient history (need ≥ 3).")
        warn("Skipping campaign generation — add more clients or lower the threshold.")
    else:
        pop_stats          = compute_population_statistics(sufficient)
        groups, _, _       = build_behavioral_groups(sufficient, pop_stats)
        display_names      = [g.display_name for g in groups]
        info(f"{len(groups)} groups: {display_names}")

        for group in groups:
            courses  = courses_for(group.dimension)
            campaign = generate_campaign(group, courses)
            subject  = campaign.get("email_subject", "(Bedrock unavailable)")
            ok(f'{group.display_name}: "{subject}"')
            time.sleep(SLEEP_SEC)

    # ── Save ───────────────────────────────────────────────────────────────────

    rule("Saving cache")
    save_cache()
    print()
    ok("data/bedrock_cache.json written.")
    info("Next: uvicorn main:app --reload --port 8000")
    print()


if __name__ == "__main__":
    main()