"""
Synthetic MT5 data generator.
Creates four clients with distinct behavioral profiles for demo and testing.

Run with:  python generate_synthetic_data.py
Output:    data/synthetic/client_A.txt  (high emotional chain)
           data/synthetic/client_B.txt  (low patience ratio)
           data/synthetic/client_C.txt  (high session variance)
           data/synthetic/client_D.txt  (clean / control)
"""

import os
import random
from datetime import datetime, timedelta

SEED = 42
random.seed(SEED)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "data", "synthetic")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Base price and position ID counter
BASE_PRICE = 1.1550
_pos_id = 152000000000


def next_pos_id() -> str:
    global _pos_id
    _pos_id += random.randint(100, 500)
    return str(_pos_id)


def fmt_time(dt: datetime) -> str:
    return dt.strftime("%Y.%m.%d %H:%M:%S")


def fmt_profit(p: float) -> str:
    """Format profit as MT5 does: negative values use '- X.XX' with a space."""
    if p < 0:
        return f"- {abs(p):.2f}"
    return f" {p:.2f}"


def make_trade(
    open_time: datetime,
    hold_minutes: float,
    is_buy: bool,
    volume: float,
    is_winner: bool,
    pips: int = 5,
) -> dict:
    """Generate one trade dict."""
    pip_size = 0.0001
    close_time = open_time + timedelta(minutes=hold_minutes)

    open_price = BASE_PRICE + random.uniform(-0.0050, 0.0050)
    open_price = round(open_price, 5)

    if is_winner:
        price_move = pips * pip_size * (1 if is_buy else -1)
    else:
        price_move = pips * pip_size * (-1 if is_buy else 1)

    close_price = round(open_price + price_move, 5)
    profit = round(price_move / pip_size * volume * 0.10 * (1 if is_buy else -1), 2)
    # Rough P&L: each pip on 0.01 lots ≈ $0.10

    return {
        "pos_id": next_pos_id(),
        "symbol": "EURUSD",
        "type": "buy" if is_buy else "sell",
        "volume": volume,
        "open_time": open_time,
        "close_time": close_time,
        "open_price": open_price,
        "close_price": close_price,
        "profit": profit,
    }


def trades_to_mt5(trades: list) -> str:
    """Render trades list to MT5 Positions format string."""
    lines = []
    lines.append("Positions")
    lines.append(
        " Time\tPosition\tSymbol\tType\tVolume\tPrice\tS / L\tT / P\tTime\tPrice\tCommission\tSwap\tProfit\t"
    )
    for t in trades:
        line = (
            f" {fmt_time(t['open_time'])}\t"
            f"{t['pos_id']}\t"
            f"{t['symbol']}\t"
            f"{t['type']}\t"
            f"{t['volume']:.2f}\t"
            f" {t['open_price']:.5f}\t"
            f"\t\t"   # blank S/L and T/P
            f"{fmt_time(t['close_time'])}\t"
            f" {t['close_price']:.5f}\t"
            f"0.00\t"
            f"0.00\t"
            f"{fmt_profit(t['profit'])}\t"
        )
        lines.append(line)
    lines.append("")
    lines.append("Orders")
    lines.append(" Open Time\tOrder\tSymbol\tType\tVolume\tPrice\tS / L\tT / P\tTime\tState\t\tComment\t\t")
    lines.append("")
    lines.append("Deals")
    lines.append(" Time\tDeal\tSymbol\tType\tDirection\tVolume\tPrice\tOrder\tCommission\tFee\tSwap\tProfit\tBalance\tComment")
    return "\n".join(lines)


# ──────────────────────────────────────────────
# Client A — High Emotional Chain Rate
# Post-loss trades opened quickly, often oversized
# ──────────────────────────────────────────────

def generate_client_a(n_trades: int = 55) -> list:
    trades = []
    current_time = datetime(2026, 4, 1, 9, 0, 0)
    last_was_loss = False
    last_close_time = None
    base_volume = 0.01

    for i in range(n_trades):
        # Decide win/loss — 40% win rate
        is_winner = random.random() < 0.40

        # If last trade was a loss, 70% chance of quick re-entry (revenge trade)
        if last_was_loss and random.random() < 0.70 and last_close_time:
            # Re-enter within 30–90 minutes of the loss closing
            gap = random.randint(15, 90)
            open_time = last_close_time + timedelta(minutes=gap)
            # Size up — emotional oversizing
            volume = round(base_volume * random.uniform(2.0, 3.5), 2)
        else:
            # Normal trade — advance time by 3–8 hours
            advance = random.randint(180, 480)
            open_time = current_time + timedelta(minutes=advance)
            volume = base_volume

        # Hold time — short (10–45 min)
        hold = random.uniform(10, 45)
        is_buy = random.random() < 0.5

        trade = make_trade(open_time, hold, is_buy, volume, is_winner)
        trades.append(trade)

        last_was_loss = not is_winner
        last_close_time = trade["close_time"]
        current_time = open_time + timedelta(minutes=5)

    trades.sort(key=lambda t: t["open_time"])
    return trades


# ──────────────────────────────────────────────
# Client B — Low Patience Ratio
# Closes winners fast, holds losers a long time
# ──────────────────────────────────────────────

def generate_client_b(n_trades: int = 50) -> list:
    trades = []
    current_time = datetime(2026, 4, 1, 8, 30, 0)

    for i in range(n_trades):
        is_winner = random.random() < 0.52
        is_buy = random.random() < 0.5

        if is_winner:
            hold = random.uniform(8, 25)   # closes winners quickly: 8–25 min
        else:
            hold = random.uniform(180, 360)  # holds losers: 3–6 hours

        volume = 0.01
        advance = random.randint(120, 300)
        open_time = current_time + timedelta(minutes=advance)

        trade = make_trade(open_time, hold, is_buy, volume, is_winner)
        trades.append(trade)
        current_time = trade["close_time"] + timedelta(minutes=random.randint(30, 90))

    trades.sort(key=lambda t: t["open_time"])
    return trades


# ──────────────────────────────────────────────
# Client C — High Session Variance
# Performs well in London, poorly in New York
# ──────────────────────────────────────────────

def generate_client_c(n_trades: int = 52) -> list:
    trades = []
    # Spread across 4 weeks — alternate London and NY sessions
    base_date = datetime(2026, 4, 1)

    for day_offset in range(28):
        if day_offset % 7 in (5, 6):  # skip weekends
            continue

        trade_date = base_date + timedelta(days=day_offset)

        # London session trades (08:00–13:00 UTC) — 65% win rate
        n_london = random.randint(1, 2)
        for _ in range(n_london):
            open_hour = random.randint(8, 12)
            open_min = random.randint(0, 59)
            open_time = trade_date.replace(hour=open_hour, minute=open_min)
            is_winner = random.random() < 0.65
            hold = random.uniform(20, 90)
            trade = make_trade(open_time, hold, random.random() < 0.5, 0.01, is_winner)
            trades.append(trade)

        # New York session trades (13:00–21:00 UTC) — 30% win rate
        n_ny = random.randint(1, 2)
        for _ in range(n_ny):
            open_hour = random.randint(13, 20)
            open_min = random.randint(0, 59)
            open_time = trade_date.replace(hour=open_hour, minute=open_min)
            is_winner = random.random() < 0.30
            hold = random.uniform(20, 90)
            trade = make_trade(open_time, hold, random.random() < 0.5, 0.01, is_winner)
            trades.append(trade)

        if len(trades) >= n_trades:
            break

    trades.sort(key=lambda t: t["open_time"])
    return trades[:n_trades]


# ──────────────────────────────────────────────
# Client D — Clean / Control
# Consistent sizing, balanced hold times, no patterns
# ──────────────────────────────────────────────

def generate_client_d(n_trades: int = 50) -> list:
    trades = []
    current_time = datetime(2026, 4, 1, 9, 0, 0)

    for i in range(n_trades):
        is_winner = random.random() < 0.55
        is_buy = random.random() < 0.5

        # Similar hold times for winners and losers
        hold = random.uniform(40, 120)
        volume = 0.01  # consistent sizing

        advance = random.randint(180, 360)
        open_time = current_time + timedelta(minutes=advance)

        trade = make_trade(open_time, hold, is_buy, volume, is_winner)
        trades.append(trade)
        current_time = trade["close_time"] + timedelta(minutes=random.randint(30, 60))

    trades.sort(key=lambda t: t["open_time"])
    return trades


# ──────────────────────────────────────────────
# Write files
# ──────────────────────────────────────────────

def main():
    clients = {
        "client_A": generate_client_a(),
        "client_B": generate_client_b(),
        "client_C": generate_client_c(),
        "client_D": generate_client_d(),
    }

    for client_id, trades in clients.items():
        content = trades_to_mt5(trades)
        path = os.path.join(OUTPUT_DIR, f"{client_id}.txt")
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Written {len(trades)} trades → {path}")

    print(f"\nAll synthetic files written to: {OUTPUT_DIR}")
    print("Run the backend and hit GET /demo/broker to verify.")


if __name__ == "__main__":
    main()
