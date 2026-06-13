"""
MT5 report parser.

Handles the structured text format:
  Positions / Orders / Deals sections separated by blank lines.
  Tab-delimited rows, blank S/L and T/P fields, space-separated negative numbers ("- 0.46").

For single-client use: parse_mt5_report(content, client_id)
For multi-client use:  parse_multiple_files({client_id: file_content})
"""

from datetime import datetime
from typing import Dict, List, Optional, Tuple
from models import Trade, TradeType


# ──────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────

def parse_mt5_report(content: str, client_id: str = "client") -> List[Trade]:
    """Parse a single MT5 trading history report. Returns list of closed trades."""
    lines = content.splitlines()
    position_rows = _extract_section(lines, "Positions")
    trades = []
    for row in position_rows:
        trade = _parse_position_row(row)
        if trade:
            trades.append(trade)
    # Sort ascending by open time
    trades.sort(key=lambda t: t.open_time)
    return trades


def parse_multiple_files(files: Dict[str, str]) -> Dict[str, List[Trade]]:
    """
    Parse multiple MT5 reports.
    files: {client_id: file_content_as_string}
    Returns: {client_id: [Trade, ...]}
    """
    result = {}
    for client_id, content in files.items():
        try:
            result[client_id] = parse_mt5_report(content, client_id)
        except Exception as e:
            print(f"[parser] Failed to parse client {client_id}: {e}")
            result[client_id] = []
    return result


# ──────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────

def _extract_section(lines: List[str], section_name: str) -> List[str]:
    """Return the data rows from a named section (skipping section header + column header)."""
    section_names = ["Positions", "Orders", "Deals"]
    start_idx = None

    for i, line in enumerate(lines):
        if line.strip() == section_name:
            start_idx = i
            break

    if start_idx is None:
        raise ValueError(f"Section '{section_name}' not found in MT5 report")

    # Find the start of the next section to know where to stop
    end_idx = len(lines)
    for other in section_names:
        if other == section_name:
            continue
        for j in range(start_idx + 1, len(lines)):
            if lines[j].strip() == other:
                end_idx = min(end_idx, j)
                break

    # +1 skips section header, +2 skips column header row
    data_rows = lines[start_idx + 2 : end_idx]
    return [r for r in data_rows if r.strip()]


def _clean_number(s: str) -> float:
    """
    Handle MT5 number quirks:
      ' 1.15503'  → 1.15503
      '- 0.46'   → -0.46
      '0.00'     → 0.00
    """
    cleaned = s.replace(" ", "")
    # After stripping spaces, "-.46" or "-0.46" are both valid Python floats
    return float(cleaned)


def _parse_datetime(s: str) -> datetime:
    return datetime.strptime(s.strip(), "%Y.%m.%d %H:%M:%S")


def _parse_position_row(line: str) -> Optional[Trade]:
    """
    Parse one Positions row.

    Column order (S/L and T/P may be blank):
      Open Time | Position ID | Symbol | Type | Volume | Open Price |
      S/L | T/P | Close Time | Close Price | Commission | Swap | Profit

    Strategy: fix the first 6 fields from the left, last 5 from the right,
    to handle variable-length S/L and T/P.
    """
    # Split on tab, strip each part, but keep blank strings so we can skip them
    raw_parts = line.split("\t")
    # Strip whitespace but preserve structure
    parts = [p.strip() for p in raw_parts]
    # Remove truly empty parts that come from blank S/L T/P
    # But we want to be careful — do this only after identifying fixed positions
    # Instead, filter out empty strings for easier indexing
    nonempty = [p for p in parts if p]

    if len(nonempty) < 8:
        return None  # not enough data

    try:
        # From the left
        open_time   = _parse_datetime(nonempty[0])
        position_id = nonempty[1]
        symbol      = nonempty[2]
        trade_type  = TradeType.BUY if nonempty[3].lower() == "buy" else TradeType.SELL
        volume      = float(nonempty[4])
        open_price  = _clean_number(nonempty[5])

        # From the right
        profit      = _clean_number(nonempty[-1])
        swap        = _clean_number(nonempty[-2])
        commission  = _clean_number(nonempty[-3])
        close_price = _clean_number(nonempty[-4])
        close_time  = _parse_datetime(nonempty[-5])

        return Trade(
            position_id=position_id,
            symbol=symbol,
            trade_type=trade_type,
            volume=volume,
            open_time=open_time,
            close_time=close_time,
            open_price=open_price,
            close_price=close_price,
            commission=commission,
            swap=swap,
            profit=profit,
        )

    except (ValueError, IndexError) as e:
        print(f"[parser] Skipping row (parse error: {e}): {line[:80]}")
        return None


# ──────────────────────────────────────────────
# Quick smoke test — run with: python parser.py
# ──────────────────────────────────────────────
if __name__ == "__main__":
    SAMPLE = """Positions
 Time\tPosition\tSymbol\tType\tVolume\tPrice\tS / L\tT / P\tTime\tPrice\tCommission\tSwap\tProfit\t
 2026.06.10 18:17:10\t152177292448\tEURUSD\tbuy\t0.01\t 1.15503\t\t\t2026.06.10 22:34:59\t 1.15450\t0.00\t0.00\t- 0.46\t
 2026.06.10 18:17:19\t152177293880\tEURUSD\tsell\t0.01\t 1.15501\t\t\t2026.06.10 22:34:56\t 1.15452\t0.00\t0.00\t 0.42\t
 2026.06.10 22:32:28\t152178761249\tEURUSD\tbuy\t0.01\t 1.15449\t\t\t2026.06.10 22:36:41\t 1.15443\t0.00\t0.00\t- 0.05\t

Orders
"""
    trades = parse_mt5_report(SAMPLE, "test_client")
    for t in trades:
        print(t.to_dict())
