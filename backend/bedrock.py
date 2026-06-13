"""
TradeMirror — Amazon Bedrock integration.

Three generation functions, all cache-backed:
  generate_autopsy_card(trade)                       → str
  generate_narrative(client_id, metrics, trades)     → str
  generate_campaign(group, courses)                  → dict

Cache lives at data/bedrock_cache.json.
Run pregenerate.py before the demo to populate it offline.
All functions return empty string / empty dict on failure so
the frontend degrades gracefully to its built-in fallbacks.
"""

import json
import logging
import os
import re
from typing import Optional, Union

log = logging.getLogger(__name__)

# ── Model config ───────────────────────────────────────────────────────────────
# Claude 3.5 Sonnet on Bedrock — verify the model ID is enabled in your region
# at: AWS Console → Bedrock → Model access

MODEL_ID    = "anthropic.claude-3-5-sonnet-20241022-v2:0"
API_VERSION = "bedrock-2023-05-31"
AWS_REGION  = os.getenv("AWS_DEFAULT_REGION", "us-east-1")

# ── Course catalog ─────────────────────────────────────────────────────────────
# Single source of truth shared by main.py and pregenerate.py.
# Mirrors COURSE_CATALOG in the React frontend.

COURSE_META: dict[str, dict] = {
    "course_exit_management_1":    {"title": "Exit management masterclass",        "description": "Techniques for holding winning positions longer and cutting losses efficiently."},
    "course_letting_winners_run_1":{"title": "Taking profits: timing your exits",  "description": "When to exit, how to set targets, and why most traders leave gains on the table."},
    "course_post_loss_1":          {"title": "Trading psychology: after a loss",   "description": "How to manage decision-making after a difficult trade."},
    "course_trading_psychology_1": {"title": "Building a pre-trade routine",       "description": "Structure your sessions to reduce emotional re-entry."},
    "course_position_sizing_1":    {"title": "Position sizing fundamentals",       "description": "Risk-based lot sizing and why consistency protects capital."},
    "course_risk_management_1":    {"title": "Risk management for retail traders", "description": "Stop-loss placement, position limits, and protecting your account."},
    "course_session_awareness_1":  {"title": "Understanding market sessions",      "description": "How London, New York, and Asia hours differ and what that means for your strategy."},
    "course_market_hours_1":       {"title": "Session timing for retail traders",  "description": "Matching your trading approach to the right market conditions."},
    "course_trading_discipline_1": {"title": "Trading discipline and patience",    "description": "Quality over quantity: why fewer, higher-conviction trades improve results."},
    "course_overtrading_1":        {"title": "Recognising overtrading patterns",   "description": "Signs that trade frequency is hurting performance and how to recalibrate."},
}

# ── Cache ──────────────────────────────────────────────────────────────────────

CACHE_PATH = os.path.join(os.path.dirname(__file__), "data", "bedrock_cache.json")

_cache: dict[str, Union[str, dict]] = {}


def load_cache() -> None:
    """Load pre-generated responses into the in-process cache. Call at startup."""
    global _cache
    if os.path.exists(CACHE_PATH):
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            _cache = json.load(f)
        log.info(f"[bedrock] Cache loaded: {len(_cache)} entries")
    else:
        log.info("[bedrock] No cache file found — Bedrock calls will be made live.")


def save_cache() -> None:
    """Persist the in-process cache to disk."""
    os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(_cache, f, indent=2, ensure_ascii=False)
    log.info(f"[bedrock] Cache saved: {len(_cache)} entries → {CACHE_PATH}")


def _get(key: str) -> Optional[Union[str, dict]]:
    return _cache.get(key)


def _set(key: str, value: Union[str, dict]) -> None:
    _cache[key] = value


# ── Bedrock client ─────────────────────────────────────────────────────────────

def _invoke(prompt: str, system: str = "", max_tokens: int = 300) -> str:
    """
    Single synchronous Bedrock call. Returns empty string on any error.
    Credentials come from the environment — no explicit keys needed on AWS
    instances with an IAM role attached.
    """
    try:
        import boto3
        client = boto3.client("bedrock-runtime", region_name=AWS_REGION)

        body: dict = {
            "anthropic_version": API_VERSION,
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system:
            body["system"] = system

        response = client.invoke_model(
            modelId=MODEL_ID,
            body=json.dumps(body),
            contentType="application/json",
            accept="application/json",
        )
        result = json.loads(response["body"].read())
        return result["content"][0]["text"].strip()

    except ImportError:
        log.error("[bedrock] boto3 not installed — run: pip install boto3")
    except Exception as e:
        log.error(f"[bedrock] invoke_model failed: {type(e).__name__}: {e}")
    return ""


# ── Generation functions ───────────────────────────────────────────────────────

def generate_autopsy_card(trade) -> str:
    """
    2–3 sentence plain-English explanation for a single flagged trade.

    Cache key: autopsy:{position_id}
    """
    key = f"autopsy:{trade.position_id}"
    if (cached := _get(key)) is not None:
        return cached  # type: ignore[return-value]

    flags_str = ", ".join(
        f.value if hasattr(f, "value") else str(f)
        for f in trade.flags
    )
    direction = trade.trade_type.value if hasattr(trade.trade_type, "value") else str(trade.trade_type)
    outcome   = "profit" if trade.is_winner else "loss"

    prompt = (
        "Write 2–3 sentences explaining the behavioural pattern in this trade. "
        "Be specific and factual. Do not give financial advice. Do not be preachy. "
        "Write only the explanation — no preamble, no heading.\n\n"
        f"Symbol: {trade.symbol}\n"
        f"Direction: {direction}\n"
        f"Held: {trade.hold_duration_minutes:.0f} minutes\n"
        f"Result: {outcome} ({trade.net_pnl:+.2f})\n"
        f"Behavioural flags: {flags_str}"
    )

    text = _invoke(prompt, max_tokens=150)
    if text:
        _set(key, text)
    return text


def generate_narrative(client_id: str, metrics, trades: list) -> str:
    """
    2–3 sentence aggregate behavioural summary for a client.
    Displayed at the top of the Client View dashboard.

    Cache key: narrative:{client_id}
    """
    key = f"narrative:{client_id}"
    if (cached := _get(key)) is not None:
        return cached  # type: ignore[return-value]

    flagged_count = sum(1 for t in trades if t.flags)
    patience_str  = (
        f"{metrics.patience_ratio:.2f}"
        if metrics.patience_ratio is not None
        else "insufficient data"
    )

    prompt = (
        "Write 2–3 sentences summarising the most significant behavioural pattern "
        "visible in this trader's data. Be specific, non-judgmental, and practical. "
        "Do not give financial advice. Write only the summary — no preamble, no heading.\n\n"
        f"Post-loss trade rate: {metrics.emotional_chain_rate:.1%}\n"
        f"Sizing consistency (CV): {metrics.sizing_cv:.2f}\n"
        f"Patience ratio (winner hold ÷ loser hold): {patience_str}\n"
        f"Session win-rate variance: {metrics.session_variance:.2f}\n"
        f"Trade frequency: {metrics.trade_frequency:.1f} per active day\n"
        f"Flagged trades: {flagged_count} of {metrics.total_trades}"
    )

    text = _invoke(prompt, max_tokens=200)
    if text:
        _set(key, text)
    return text


def generate_campaign(group, courses: list[dict]) -> dict:
    """
    Generate campaign content for a behavioral group.
    Returns dict: {email_subject, email_body, notification, talking_points}.
    Returns empty dict on failure — frontend uses CAMPAIGN_FALLBACK.

    Cache key: campaign:{dimension}
    """
    key = f"campaign:{group.dimension}"
    if (cached := _get(key)) is not None:
        return cached if isinstance(cached, dict) else {}

    course_lines = "\n".join(
        f"  - {c.get('title', '')}: {c.get('description', '')}"
        for c in courses
    )

    prompt = (
        f"Generate campaign content for a group of {group.client_count} traders "
        f"who share a specific behavioural pattern.\n\n"
        f"Pattern: {group.display_name}\n"
        f"Description: {group.behavioral_description}\n"
        f"Courses to reference:\n{course_lines}\n\n"
        "Rules:\n"
        "- Professional tone, not preachy or salesy\n"
        "- The trader is intelligent — do not patronise them\n"
        "- Reference the behavioural pattern without negative framing\n"
        "- email_body: 3–4 sentences, natural register\n"
        "- notification: 1 sentence, under 120 characters\n"
        "- talking_points: exactly 3 bullet points starting with ·\n\n"
        "Return ONLY valid JSON with exactly these keys — no markdown, no explanation:\n"
        '{"email_subject": "...", "email_body": "...", "notification": "...", "talking_points": "..."}'
    )

    raw    = _invoke(prompt, max_tokens=500)
    result = _parse_json(raw)

    if result:
        _set(key, result)
    return result


# ── JSON parsing ───────────────────────────────────────────────────────────────

def _parse_json(raw: str) -> dict:
    """
    Robustly parse JSON from a Bedrock response.
    Strips markdown fences and falls back to regex extraction.
    """
    if not raw:
        return {}

    # Strip ```json ... ``` fences
    cleaned = re.sub(r"```(?:json)?\n?", "", raw).strip().rstrip("`")

    # Direct parse
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Extract first {...} block
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    log.warning(f"[bedrock] Could not parse JSON: {raw[:120]!r}")
    return {}