from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict
from enum import Enum


class TradeType(str, Enum):
    BUY = "buy"
    SELL = "sell"


class TradeFlag(str, Enum):
    POST_LOSS = "post_loss"        # opened within 120min of a closing loss
    OVERSIZED = "oversized"        # volume > 1.5x rolling average
    EARLY_EXIT = "early_exit"      # winning trade closed faster than 50% of median winner hold


class Session(str, Enum):
    ASIA = "Asia"
    LONDON = "London"
    NEW_YORK = "New York"
    LATE = "Late"


@dataclass
class Trade:
    position_id: str
    symbol: str
    trade_type: TradeType
    volume: float
    open_time: datetime
    close_time: datetime
    open_price: float
    close_price: float
    commission: float
    swap: float
    profit: float

    # Derived — computed in __post_init__
    net_pnl: float = field(init=False)
    hold_duration_minutes: float = field(init=False)
    is_winner: Optional[bool] = field(init=False)
    session: str = field(init=False)
    flags: List[TradeFlag] = field(default_factory=list)

    def __post_init__(self):
        self.net_pnl = self.profit + self.swap + self.commission
        delta = self.close_time - self.open_time
        self.hold_duration_minutes = delta.total_seconds() / 60
        if self.net_pnl > 0:
            self.is_winner = True
        elif self.net_pnl < 0:
            self.is_winner = False
        else:
            self.is_winner = None  # breakeven — excluded from win/loss metrics
        self.session = self._assign_session()

    def _assign_session(self) -> str:
        hour = self.open_time.hour  # assumes UTC — adjust offset if needed
        if 0 <= hour < 8:
            return Session.ASIA
        elif 8 <= hour < 13:
            return Session.LONDON
        elif 13 <= hour < 21:
            return Session.NEW_YORK
        else:
            return Session.LATE

    def to_dict(self) -> dict:
        return {
            "position_id": self.position_id,
            "symbol": self.symbol,
            "trade_type": self.trade_type,
            "volume": self.volume,
            "open_time": self.open_time.isoformat(),
            "close_time": self.close_time.isoformat(),
            "open_price": self.open_price,
            "close_price": self.close_price,
            "net_pnl": round(self.net_pnl, 2),
            "hold_duration_minutes": round(self.hold_duration_minutes, 1),
            "is_winner": self.is_winner,
            "session": self.session,
            "flags": [f.value for f in self.flags],
        }


@dataclass
class SessionStats:
    session: str
    trade_count: int
    win_rate: float
    avg_pnl: float


@dataclass
class BehavioralMetrics:
    # Core metrics
    emotional_chain_rate: float         # 0–1: proportion of post-loss trades
    sizing_cv: float                    # coefficient of variation of lot sizes
    patience_ratio: Optional[float]     # winner hold / loser hold median; None if insufficient data
    session_variance: float             # best – worst session win rate
    trade_frequency: float              # trades per active day

    # Supporting data
    total_trades: int
    sufficient_history: bool            # requires >= 20 trades
    session_stats: Dict[str, dict] = field(default_factory=dict)

    # Flagged trade IDs — used to attach flags back to Trade objects
    post_loss_ids: List[str] = field(default_factory=list)
    oversized_ids: List[str] = field(default_factory=list)
    early_exit_ids: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "emotional_chain_rate": round(self.emotional_chain_rate, 4),
            "sizing_cv": round(self.sizing_cv, 4),
            "patience_ratio": round(self.patience_ratio, 4) if self.patience_ratio else None,
            "session_variance": round(self.session_variance, 4),
            "trade_frequency": round(self.trade_frequency, 2),
            "total_trades": self.total_trades,
            "sufficient_history": self.sufficient_history,
            "session_stats": self.session_stats,
        }


@dataclass
class ClientAnalysis:
    client_id: str
    trades: List[Trade]
    metrics: BehavioralMetrics
    narrative: str = ""             # Bedrock aggregate narrative
    autopsy_cards: Dict[str, str] = field(default_factory=dict)  # position_id → Bedrock text

    def to_dict(self) -> dict:
        return {
            "client_id": self.client_id,
            "metrics": self.metrics.to_dict(),
            "trades": [t.to_dict() for t in self.trades],
            "narrative": self.narrative,
            "autopsy_cards": self.autopsy_cards,
            "flagged_count": len(self.metrics.post_loss_ids)
                             + len(self.metrics.oversized_ids)
                             + len(self.metrics.early_exit_ids),
        }


@dataclass
class ConcernScores:
    emotional_chain_rate: float
    sizing_cv: float
    patience_ratio: float   # already flipped: high = low patience = concerning
    session_variance: float
    trade_frequency: float

    def as_dict(self) -> Dict[str, float]:
        return {
            "emotional_chain_rate": self.emotional_chain_rate,
            "sizing_cv": self.sizing_cv,
            "patience_ratio": self.patience_ratio,
            "session_variance": self.session_variance,
            "trade_frequency": self.trade_frequency,
        }

    def primary_signal(self, threshold: float = 1.0) -> Optional[str]:
        """Return the dimension with the highest concern score above threshold."""
        scores = {k: v for k, v in self.as_dict().items() if v is not None}
        if not scores:
            return None
        best = max(scores, key=scores.get)
        return best if scores[best] >= threshold else None


@dataclass
class BehavioralGroup:
    dimension: str
    display_name: str
    client_ids: List[str]
    behavioral_description: str
    recommended_course_ids: List[str]
    campaign_email_subject: str = ""
    campaign_email_body: str = ""
    campaign_notification: str = ""
    campaign_talking_points: str = ""

    @property
    def client_count(self) -> int:
        return len(self.client_ids)

    def to_dict(self) -> dict:
        return {
            "dimension": self.dimension,
            "display_name": self.display_name,
            "client_count": self.client_count,
            "client_ids": self.client_ids,
            "behavioral_description": self.behavioral_description,
            "recommended_course_ids": self.recommended_course_ids,
            "campaign": {
                "email_subject": self.campaign_email_subject,
                "email_body": self.campaign_email_body,
                "notification": self.campaign_notification,
                "talking_points": self.campaign_talking_points,
            },
        }


# Display names for each dimension shown in the broker UI
DIMENSION_DISPLAY_NAMES = {
    "emotional_chain_rate": "Post-Loss Trading",
    "sizing_cv": "Position Sizing",
    "patience_ratio": "Exit Management",
    "session_variance": "Session Awareness",
    "trade_frequency": "Trade Frequency",
}
