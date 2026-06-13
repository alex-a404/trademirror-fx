"""
Behavioral computation engine.

Computes the five behavioral metrics for a list of trades
and attaches per-trade flags.

All logic is deterministic arithmetic — no external data, no ML.
"""

import statistics
from typing import List, Optional, Tuple, Dict
from models import Trade, TradeFlag, BehavioralMetrics

MIN_HISTORY = 20          # minimum trades for reliable metrics
MIN_SESSION_TRADES = 10   # minimum trades in a session to include in session stats
EMOTIONAL_CHAIN_WINDOW = 120  # minutes — window to flag post-loss trades
SIZING_OUTLIER_MULTIPLIER = 1.5  # flag if volume > X * rolling mean
SIZING_ROLLING_WINDOW = 10       # trades to use in rolling mean
EARLY_EXIT_THRESHOLD = 0.5       # fraction of median winner hold — flag if below this


# ──────────────────────────────────────────────
# Public entry point
# ──────────────────────────────────────────────

def compute_metrics(trades: List[Trade]) -> BehavioralMetrics:
    """
    Main entry point. Computes all metrics and attaches flags to Trade objects.
    Returns BehavioralMetrics.
    """
    if len(trades) < MIN_HISTORY:
        return BehavioralMetrics(
            emotional_chain_rate=0.0,
            sizing_cv=0.0,
            patience_ratio=None,
            session_variance=0.0,
            trade_frequency=0.0,
            total_trades=len(trades),
            sufficient_history=False,
        )

    # Sort ascending by open time (parser should do this, but be safe)
    trades_sorted = sorted(trades, key=lambda t: t.open_time)

    # Run each metric
    emotional_chain_rate, post_loss_ids = _emotional_chain_rate(trades_sorted)
    sizing_cv, oversized_ids = _sizing_metrics(trades_sorted)
    patience_ratio = _patience_ratio(trades_sorted)
    session_variance, session_stats = _session_performance(trades_sorted)
    trade_frequency = _trade_frequency(trades_sorted)
    early_exit_ids = _early_exits(trades_sorted)

    # Attach flags back to Trade objects in place
    post_loss_set = set(post_loss_ids)
    oversized_set = set(oversized_ids)
    early_exit_set = set(early_exit_ids)

    for trade in trades:
        trade.flags = []
        if trade.position_id in post_loss_set:
            trade.flags.append(TradeFlag.POST_LOSS)
        if trade.position_id in oversized_set:
            trade.flags.append(TradeFlag.OVERSIZED)
        if trade.position_id in early_exit_set:
            trade.flags.append(TradeFlag.EARLY_EXIT)

    return BehavioralMetrics(
        emotional_chain_rate=emotional_chain_rate,
        sizing_cv=sizing_cv,
        patience_ratio=patience_ratio,
        session_variance=session_variance,
        trade_frequency=trade_frequency,
        total_trades=len(trades),
        sufficient_history=True,
        session_stats=session_stats,
        post_loss_ids=post_loss_ids,
        oversized_ids=oversized_ids,
        early_exit_ids=early_exit_ids,
    )


# ──────────────────────────────────────────────
# Metric 1 — Emotional Chain Rate
# ──────────────────────────────────────────────

def _emotional_chain_rate(trades: List[Trade]) -> Tuple[float, List[str]]:
    """
    For each trade, find the most recent trade that CLOSED before it OPENED.
    If that prior trade was a loser AND the gap is <= EMOTIONAL_CHAIN_WINDOW minutes,
    flag this trade as POST_LOSS.

    Returns: (rate, list of flagged position_ids)
    """
    flagged = []
    eligible = 0

    for i, trade in enumerate(trades):
        # All trades that closed before this one opened
        prior_closed = [
            t for t in trades[:i]
            if t.close_time < trade.open_time and t.is_winner is not None
        ]
        if not prior_closed:
            continue

        eligible += 1
        most_recent = max(prior_closed, key=lambda t: t.close_time)

        if most_recent.is_winner is False:
            gap_minutes = (trade.open_time - most_recent.close_time).total_seconds() / 60
            if gap_minutes <= EMOTIONAL_CHAIN_WINDOW:
                flagged.append(trade.position_id)

    rate = len(flagged) / eligible if eligible > 0 else 0.0
    return rate, flagged


# ──────────────────────────────────────────────
# Metric 2 — Sizing CV and Outlier Flags
# ──────────────────────────────────────────────

def _sizing_metrics(trades: List[Trade]) -> Tuple[float, List[str]]:
    """
    CV: std(volumes) / mean(volumes) across all trades.
    Outlier flag: volume > SIZING_OUTLIER_MULTIPLIER * rolling mean of prior N trades.

    Returns: (cv, list of oversized position_ids)
    """
    volumes = [t.volume for t in trades]

    # Coefficient of variation
    if len(volumes) < 2:
        cv = 0.0
    else:
        mean_v = statistics.mean(volumes)
        std_v = statistics.stdev(volumes)
        cv = std_v / mean_v if mean_v > 0 else 0.0

    # Rolling outlier detection
    flagged = []
    for i, trade in enumerate(trades):
        if i == 0:
            continue  # no prior trades to build a mean
        window_start = max(0, i - SIZING_ROLLING_WINDOW)
        window_vols = volumes[window_start:i]
        rolling_mean = statistics.mean(window_vols)
        if trade.volume > SIZING_OUTLIER_MULTIPLIER * rolling_mean:
            flagged.append(trade.position_id)

    return cv, flagged


# ──────────────────────────────────────────────
# Metric 3 — Patience Ratio
# ──────────────────────────────────────────────

def _patience_ratio(trades: List[Trade]) -> Optional[float]:
    """
    median(winner hold durations) / median(loser hold durations).
    Returns None if < 5 winners or < 5 losers.
    Uses median to reduce skew from outlier hold times.
    """
    winners = [t for t in trades if t.is_winner is True]
    losers  = [t for t in trades if t.is_winner is False]

    if len(winners) < 5 or len(losers) < 5:
        return None

    winner_hold = statistics.median([t.hold_duration_minutes for t in winners])
    loser_hold  = statistics.median([t.hold_duration_minutes for t in losers])

    if loser_hold == 0:
        return None

    return winner_hold / loser_hold


# ──────────────────────────────────────────────
# Metric 4 — Session Performance
# ──────────────────────────────────────────────

def _session_performance(trades: List[Trade]) -> Tuple[float, Dict[str, dict]]:
    """
    Win rate and avg P&L per session.
    Variance = best qualifying session win rate - worst qualifying session win rate.
    A session qualifies if it has >= MIN_SESSION_TRADES with definitive outcomes.

    Returns: (variance, {session_name: {trade_count, win_rate, avg_pnl}})
    """
    buckets: Dict[str, List[Trade]] = {}
    for trade in trades:
        buckets.setdefault(trade.session, []).append(trade)

    session_stats = {}
    win_rates = []

    for session, session_trades in buckets.items():
        decisive = [t for t in session_trades if t.is_winner is not None]
        if len(decisive) < MIN_SESSION_TRADES:
            continue
        winners = [t for t in decisive if t.is_winner]
        win_rate = len(winners) / len(decisive)
        avg_pnl = statistics.mean([t.net_pnl for t in session_trades])
        session_stats[session] = {
            "trade_count": len(session_trades),
            "win_rate": round(win_rate, 4),
            "avg_pnl": round(avg_pnl, 2),
        }
        win_rates.append(win_rate)

    variance = (max(win_rates) - min(win_rates)) if len(win_rates) >= 2 else 0.0
    return variance, session_stats


# ──────────────────────────────────────────────
# Metric 5 — Trade Frequency
# ──────────────────────────────────────────────

def _trade_frequency(trades: List[Trade]) -> float:
    """
    Trades per active day.
    Active day = any calendar date on which at least one trade was opened.
    Ignores inactive days to avoid penalising part-time traders.
    """
    if not trades:
        return 0.0
    active_days = len({t.open_time.date() for t in trades})
    return len(trades) / active_days if active_days > 0 else 0.0


# ──────────────────────────────────────────────
# Per-trade flag: Early Exit
# ──────────────────────────────────────────────

def _early_exits(trades: List[Trade]) -> List[str]:
    """
    Flag winning trades closed in < EARLY_EXIT_THRESHOLD * median winner hold.
    Requires >= 5 winners for a stable median.
    """
    winners = [t for t in trades if t.is_winner is True]
    if len(winners) < 5:
        return []

    median_hold = statistics.median([t.hold_duration_minutes for t in winners])
    threshold = EARLY_EXIT_THRESHOLD * median_hold

    return [t.position_id for t in winners if t.hold_duration_minutes < threshold]


# ──────────────────────────────────────────────
# Quick smoke test — run with: python computation.py
# ──────────────────────────────────────────────
if __name__ == "__main__":
    from parser import parse_mt5_report

    SAMPLE = """Positions
 Time\tPosition\tSymbol\tType\tVolume\tPrice\tS / L\tT / P\tTime\tPrice\tCommission\tSwap\tProfit\t
 2026.06.10 18:17:10\t152177292448\tEURUSD\tbuy\t0.01\t 1.15503\t\t\t2026.06.10 22:34:59\t 1.15450\t0.00\t0.00\t- 0.46\t
 2026.06.10 18:17:19\t152177293880\tEURUSD\tsell\t0.01\t 1.15501\t\t\t2026.06.10 22:34:56\t 1.15452\t0.00\t0.00\t 0.42\t
 2026.06.10 22:32:28\t152178761249\tEURUSD\tbuy\t0.01\t 1.15449\t\t\t2026.06.10 22:36:41\t 1.15443\t0.00\t0.00\t- 0.05\t

Orders
"""
    trades = parse_mt5_report(SAMPLE, "test")
    metrics = compute_metrics(trades)
    print("Metrics:", metrics.to_dict())
    print("Flagged trade IDs:", metrics.post_loss_ids, metrics.oversized_ids)
