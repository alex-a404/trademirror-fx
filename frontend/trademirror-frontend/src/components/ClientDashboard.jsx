import { Fragment, useEffect, useState } from 'react'
import InsightCard, {
  AUTOPSY_FALLBACK,
  FlagBadge,
  METRIC_CONFIG,
} from './InsightCard'
import PatienceRatioVisual, { SessionWinRate } from './PatienceRatioVisual'
import TradeSequenceStrip from './TradeSequenceStrip'
import WhatIfSimulator from './WhatIfSimulator'

function avg(arr) {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0
}

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

export default function ClientDashboard({
  brokerName = 'Demo Broker',
  clientLabel = null,
}) {
  const [clientData, setClientData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedRows, setExpandedRows] = useState(new Set())

  useEffect(() => {
    fetch('http://localhost:8000/demo/client/client_A')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        setClientData(data)
        setLoading(false)
      })
      .catch((e) => {
        setError(e.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
        <p className="mt-4 text-sm text-gray-500">Analyzing trader behavior...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <p className="text-sm text-red-500">
          Could not load analysis ({error}). Is the backend running on port 8000?
        </p>
      </div>
    )
  }

  if (!clientData) return null

  const analysis = clientData
  const { metrics, trades, narrative, autopsy_cards, client_id } = analysis
  const displayLabel = clientLabel || client_id

  const winnerHolds = trades
    .filter((t) => t.is_winner === true)
    .map((t) => t.hold_duration_minutes)
  const loserHolds = trades
    .filter((t) => t.is_winner === false)
    .map((t) => t.hold_duration_minutes)
  const avgWinner = avg(winnerHolds)
  const avgLoser = avg(loserHolds)

  function toggleRow(id) {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function autopsyFor(trade) {
    return (
      autopsy_cards?.[trade.position_id]
      || (trade.flags?.[0] ? AUTOPSY_FALLBACK[trade.flags[0]] : null)
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <nav className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-2.5">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 select-none items-center justify-center rounded-[5px] bg-blue-50 text-[9px] font-semibold text-blue-700">
              VX
            </div>
            <span className="text-sm font-medium">{brokerName}</span>
          </div>
          <div className="flex items-center gap-5">
            {['Overview', 'My trades', 'Performance', 'Academy', 'Support'].map((item) => (
              <span
                key={item}
                className={`cursor-pointer select-none pb-0.5 text-xs transition-colors ${
                  item === 'Performance'
                    ? 'border-b-[1.5px] border-gray-900 font-medium text-gray-900'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-[10px] font-medium text-gray-500">
          JD
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-5 py-6">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h1 className="text-lg font-medium">My performance</h1>
            <p className="mt-0.5 text-xs text-gray-400">
              {trades.length} trades · {displayLabel}
            </p>
          </div>
          <span className="text-[10px] text-gray-400">Powered by TradeMirror</span>
        </div>

        <div className="mb-5 grid grid-cols-5 gap-2">
          {Object.entries(METRIC_CONFIG).map(([key, cfg]) => {
            const val = metrics[key]
            const status = cfg.status(val)
            return (
              <InsightCard
                key={key}
                label={cfg.label}
                value={cfg.format(val)}
                status={status}
              />
            )
          })}
        </div>

        {narrative ? (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border-l-2 border-red-300 bg-gray-50 px-4 py-3">
            <span className="mt-0.5 shrink-0 text-xs text-gray-400">✦</span>
            <p className="text-sm leading-relaxed">{narrative}</p>
          </div>
        ) : null}

        <div className="mb-5 grid grid-cols-2 gap-4">
          <PatienceRatioVisual
            avgWinner={avgWinner}
            avgLoser={avgLoser}
            patienceRatio={metrics.patience_ratio}
          />
          <SessionWinRate sessionStats={metrics.session_stats} />
        </div>

        <TradeSequenceStrip trades={trades} autopsyCards={autopsy_cards} />

        <WhatIfSimulator trades={trades} />

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="text-sm font-medium">All trades</div>
            <div className="text-xs text-gray-400">
              {trades.length} total · click flagged row to expand
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50">
                  {['Opened', 'Symbol', 'Direction', 'Duration', 'P&L', 'Flags'].map(
                    (h, i) => (
                      <th
                        key={h}
                        className={`px-4 py-2 font-medium text-gray-500 ${
                          i >= 3 ? (i === 5 ? 'text-left' : 'text-right') : 'text-left'
                        }`}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => {
                  const hasFl = (trade.flags ?? []).length > 0
                  const expanded = expandedRows.has(trade.position_id)
                  const autopsy = autopsyFor(trade)

                  return (
                    <Fragment key={trade.position_id}>
                      <tr
                        onClick={() => hasFl && toggleRow(trade.position_id)}
                        className={`border-t border-gray-100 transition-colors ${
                          hasFl ? 'cursor-pointer hover:bg-gray-50' : ''
                        }`}
                      >
                        <td className="whitespace-nowrap px-4 py-2 text-gray-500">
                          {formatDate(trade.open_time)}
                        </td>
                        <td className="px-4 py-2 font-medium">{trade.symbol}</td>
                        <td className="px-4 py-2 capitalize text-gray-500">
                          {trade.trade_type}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-500">
                          {formatDuration(trade.hold_duration_minutes)}
                        </td>
                        <td
                          className={`px-4 py-2 text-right font-medium ${
                            trade.is_winner ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {trade.net_pnl >= 0 ? '+' : ''}
                          {trade.net_pnl.toFixed(2)}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1">
                            {hasFl ? (
                              trade.flags.map((f) => <FlagBadge key={f} flag={f} />)
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                      {hasFl && expanded && autopsy && (
                        <tr className="bg-gray-50">
                          <td
                            colSpan={6}
                            className="px-10 py-3 text-xs leading-relaxed text-gray-500"
                          >
                            <span className="flex items-start gap-2">
                              <span className="mt-0.5 shrink-0 text-gray-400">✦</span>
                              <span>{autopsy}</span>
                            </span>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
