"""
Broker-side routing engine.

Takes a population of client BehavioralMetrics, computes population statistics,
assigns each client a primary behavioral signal, and builds behavioral groups
with mechanically generated descriptions.
"""

import statistics
from typing import Dict, List, Optional, Tuple
from models import (
    BehavioralMetrics,
    ConcernScores,
    BehavioralGroup,
    DIMENSION_DISPLAY_NAMES,
)

# Concern score threshold — clients below this on all dimensions go to no_signal bucket
PRIMARY_SIGNAL_THRESHOLD = 1.0

# Mechanical description templates per dimension
# Used to build group descriptions from population comparisons
_DESCRIPTION_TEMPLATES = {
    "emotional_chain_rate": (
        "A higher proportion of trades in this group are opened shortly after a closing loss "
        "compared to the rest of your client base."
    ),
    "sizing_cv": (
        "Position sizes in this group vary significantly from trade to trade, "
        "more so than the broader population."
    ),
    "patience_ratio": (
        "Clients in this group tend to close profitable trades more quickly than losing trades "
        "relative to the population average."
    ),
    "session_variance": (
        "Performance in this group varies considerably between trading sessions, "
        "more than is typical across your clients."
    ),
    "trade_frequency": (
        "Clients in this group trade more frequently per active day "
        "than the population average."
    ),
}

# Content library mapping: dimension → list of course IDs from the content library
DIMENSION_CONTENT_MAP = {
    "emotional_chain_rate": ["course_post_loss_1", "course_trading_psychology_1"],
    "sizing_cv":            ["course_position_sizing_1", "course_risk_management_1"],
    "patience_ratio":       ["course_exit_management_1", "course_letting_winners_run_1"],
    "session_variance":     ["course_session_awareness_1", "course_market_hours_1"],
    "trade_frequency":      ["course_trading_discipline_1", "course_overtrading_1"],
}


# ──────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────

def compute_population_statistics(
    client_metrics: Dict[str, BehavioralMetrics]
) -> Dict[str, Dict[str, float]]:
    """
    Compute mean and std for each feature across all sufficient-history clients.
    Returns: {feature_name: {mean: float, std: float}}
    """
    sufficient = {
        cid: m for cid, m in client_metrics.items() if m.sufficient_history
    }

    if len(sufficient) < 3:
        raise ValueError(
            f"Need at least 3 clients with sufficient history. Got {len(sufficient)}."
        )

    features = [
        "emotional_chain_rate",
        "sizing_cv",
        "session_variance",
        "trade_frequency",
    ]

    pop_stats: Dict[str, Dict[str, float]] = {}

    for feature in features:
        values = [getattr(m, feature) for m in sufficient.values()]
        pop_stats[feature] = _safe_stats(values)

    # Patience ratio — optional (clients may have None)
    patience_values = [
        m.patience_ratio
        for m in sufficient.values()
        if m.patience_ratio is not None
    ]
    if len(patience_values) >= 3:
        pop_stats["patience_ratio"] = _safe_stats(patience_values)

    return pop_stats


def compute_concern_scores(
    metrics: BehavioralMetrics,
    pop_stats: Dict[str, Dict[str, float]],
) -> ConcernScores:
    """
    Compute directional z-scores (concern scores) for a single client.
    Higher score = more concerning deviation from population.
    Patience ratio is flipped — low patience is the concerning direction.
    """

    def z(feature: str) -> float:
        if feature not in pop_stats:
            return 0.0
        value = getattr(metrics, feature)
        if value is None:
            return 0.0
        mean = pop_stats[feature]["mean"]
        std  = pop_stats[feature]["std"]
        return (value - mean) / std if std > 0 else 0.0

    patience_z = z("patience_ratio")

    return ConcernScores(
        emotional_chain_rate=z("emotional_chain_rate"),
        sizing_cv=z("sizing_cv"),
        patience_ratio=-patience_z,   # flip: low patience = high concern
        session_variance=z("session_variance"),
        trade_frequency=z("trade_frequency"),
    )


def build_behavioral_groups(
    client_metrics: Dict[str, BehavioralMetrics],
    pop_stats: Dict[str, Dict[str, float]],
) -> Tuple[List[BehavioralGroup], List[str], List[str]]:
    """
    Assign each sufficient-history client to a behavioral group
    based on their primary concern signal.

    Returns:
      - groups: List[BehavioralGroup] (one per active dimension)
      - no_signal_clients: client IDs below threshold on all dimensions
      - excluded_clients: insufficient history
    """
    groups_by_dim: Dict[str, List[str]] = {dim: [] for dim in DIMENSION_DISPLAY_NAMES}
    no_signal_clients: List[str] = []
    excluded_clients: List[str] = []

    for client_id, metrics in client_metrics.items():
        if not metrics.sufficient_history:
            excluded_clients.append(client_id)
            continue

        concern = compute_concern_scores(metrics, pop_stats)
        primary = concern.primary_signal(threshold=PRIMARY_SIGNAL_THRESHOLD)

        if primary is None:
            no_signal_clients.append(client_id)
        else:
            groups_by_dim[primary].append(client_id)

    # Build BehavioralGroup objects — only for dimensions that have clients
    groups: List[BehavioralGroup] = []
    for dim, client_ids in groups_by_dim.items():
        if not client_ids:
            continue
        group = BehavioralGroup(
            dimension=dim,
            display_name=DIMENSION_DISPLAY_NAMES[dim],
            client_ids=client_ids,
            behavioral_description=_DESCRIPTION_TEMPLATES[dim],
            recommended_course_ids=DIMENSION_CONTENT_MAP.get(dim, []),
        )
        groups.append(group)

    # Sort groups by size descending
    groups.sort(key=lambda g: g.client_count, reverse=True)

    return groups, no_signal_clients, excluded_clients


def get_client_signals(
    client_metrics: Dict[str, BehavioralMetrics],
    pop_stats: Dict[str, Dict[str, float]],
) -> Dict[str, dict]:
    """
    Return a dict of {client_id: {primary_signal, concern_strength, concern_scores}}
    for the broker client list view.
    """
    result = {}
    for client_id, metrics in client_metrics.items():
        if not metrics.sufficient_history:
            result[client_id] = {
                "primary_signal": None,
                "concern_strength": 0.0,
                "concern_scores": {},
                "sufficient_history": False,
            }
            continue

        concern = compute_concern_scores(metrics, pop_stats)
        scores = concern.as_dict()
        primary = concern.primary_signal(threshold=PRIMARY_SIGNAL_THRESHOLD)
        strength = scores.get(primary, 0.0) if primary else 0.0

        result[client_id] = {
            "primary_signal": primary,
            "display_name": DIMENSION_DISPLAY_NAMES.get(primary, "") if primary else "No prominent signal",
            "concern_strength": round(strength, 3),
            "concern_scores": {k: round(v, 3) for k, v in scores.items()},
            "sufficient_history": True,
        }
    return result


# ──────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────

def _safe_stats(values: List[float]) -> Dict[str, float]:
    mean = statistics.mean(values)
    std  = statistics.stdev(values) if len(values) > 1 else 1.0
    std  = std if std > 0 else 1.0  # avoid division by zero
    return {"mean": mean, "std": std}


# ──────────────────────────────────────────────
# Quick smoke test — run with: python routing.py
# ──────────────────────────────────────────────
if __name__ == "__main__":
    from models import BehavioralMetrics

    # Synthetic metrics for 4 clients
    mock_metrics = {
        "client_A": BehavioralMetrics(
            emotional_chain_rate=0.45, sizing_cv=0.8,
            patience_ratio=0.6, session_variance=0.1,
            trade_frequency=5.0, total_trades=50, sufficient_history=True,
        ),
        "client_B": BehavioralMetrics(
            emotional_chain_rate=0.05, sizing_cv=0.9,
            patience_ratio=0.55, session_variance=0.12,
            trade_frequency=4.0, total_trades=45, sufficient_history=True,
        ),
        "client_C": BehavioralMetrics(
            emotional_chain_rate=0.08, sizing_cv=0.15,
            patience_ratio=1.8, session_variance=0.45,
            trade_frequency=3.5, total_trades=40, sufficient_history=True,
        ),
        "client_D": BehavioralMetrics(
            emotional_chain_rate=0.06, sizing_cv=0.12,
            patience_ratio=1.5, session_variance=0.08,
            trade_frequency=3.0, total_trades=60, sufficient_history=True,
        ),
    }

    pop_stats = compute_population_statistics(mock_metrics)
    print("Population stats:", pop_stats)

    groups, no_signal, excluded = build_behavioral_groups(mock_metrics, pop_stats)
    for g in groups:
        print(f"\nGroup: {g.display_name} — {g.client_count} clients: {g.client_ids}")
        print(f"  Description: {g.behavioral_description}")
