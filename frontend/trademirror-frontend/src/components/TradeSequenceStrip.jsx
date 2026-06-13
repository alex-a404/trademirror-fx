import { useState } from 'react'
import { AUTOPSY_FALLBACK, FlagBadge } from './InsightCard'

function formatDuration(minutes) {
  if (!minutes) return '—'
  if (minutes < 60) return `${Math.round(minutes)} min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export default function TradeSequenceStrip({ trades = [], autopsyCards = {} }) {
  const [selectedTrade, setSelectedTrade] = useState(null)

  function selectTrade(trade) {
    setSelectedTrade((prev) =>
      prev?.position_id === trade.position_id ? null : trade,
    )
  }

  function autopsyFor(trade) {
    return (
      autopsyCards?.[trade.position_id]
      || (trade.flags?.[0] ? AUTOPSY_FALLBACK[trade.flags[0]] : null)
    )
  }

  return (
    <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium">Trade sequence</div>
        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> Winner
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Loser
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-gray-200 ring-2 ring-amber-400 ring-offset-1" />{' '}
            Flagged
          </span>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {trades.map((trade, i) => {
          const flagged = (trade.flags ?? []).length > 0
          const isSelected = selectedTrade?.position_id === trade.position_id

          return (
            <button
              key={trade.position_id}
              type="button"
              onClick={() => selectTrade(trade)}
              title={`Trade #${i + 1}${flagged ? ` · ${trade.flags.join(', ')}` : ''}`}
              className="cursor-pointer rounded-full transition-transform focus:outline-none"
              style={{
                width: 12,
                height: 12,
                background: trade.is_winner ? '#10b981' : '#ef4444',
                outline: flagged ? '2px solid #f59e0b' : 'none',
                outlineOffset: 1,
                flexShrink: 0,
                transform: isSelected ? 'scale(1.6)' : undefined,
                margin: isSelected ? '0 2px' : undefined,
              }}
            />
          )
        })}
      </div>

      <div className="min-h-[40px] border-t border-gray-100 pt-3">
        {selectedTrade ? (
          <div className="text-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">
                Trade #
                {trades.findIndex((t) => t.position_id === selectedTrade.position_id) + 1}
              </span>
              <span className="capitalize text-gray-500">
                {selectedTrade.symbol} · {selectedTrade.trade_type}
              </span>
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span>{formatDate(selectedTrade.open_time)}</span>
              <span>· {formatDuration(selectedTrade.hold_duration_minutes)}</span>
              <span
                className={`font-medium ${selectedTrade.is_winner ? 'text-emerald-600' : 'text-red-600'}`}
              >
                {selectedTrade.net_pnl >= 0 ? '+' : ''}
                {selectedTrade.net_pnl.toFixed(2)}
              </span>
              <div className="flex flex-wrap gap-1">
                {(selectedTrade.flags ?? []).map((f) => (
                  <FlagBadge key={f} flag={f} />
                ))}
              </div>
            </div>
            {(selectedTrade.flags ?? []).length > 0 && autopsyFor(selectedTrade) && (
              <div className="flex items-start gap-2 border-t border-gray-100 pt-2">
                <span className="mt-0.5 shrink-0 text-xs text-gray-400">✦</span>
                <p className="text-xs leading-relaxed text-gray-500">
                  {autopsyFor(selectedTrade)}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400">Click any dot to inspect that trade</p>
        )}
      </div>
    </div>
  )
}
