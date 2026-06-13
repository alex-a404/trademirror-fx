function dotColor(isWinner) {
  if (isWinner === true) return 'bg-emerald-500'
  if (isWinner === false) return 'bg-rose-500'
  return 'bg-slate-400'
}

function formatFlagName(flag) {
  return String(flag).replace(/-/g, '_').toUpperCase()
}

function formatDuration(minutes) {
  if (minutes == null) return '—'
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }
  return `${Math.round(minutes)}m`
}

function formatPrice(price) {
  if (price == null) return '—'
  return Number(price).toFixed(5)
}

function formatPnl(pnl) {
  if (pnl == null) return '—'
  const value = Number(pnl)
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${value.toFixed(2)}`
}

function pnlColorClass(pnl) {
  if (pnl == null) return 'text-slate-700'
  const value = Number(pnl)
  if (value > 0) return 'text-emerald-600'
  if (value < 0) return 'text-rose-600'
  return 'text-slate-700'
}

function TradeTooltip({ trade }) {
  const flags = trade.flags ?? []
  const hasFlags = flags.length > 0

  const rows = [
    { label: 'Symbol', value: trade.symbol ?? '—' },
    { label: 'Type', value: trade.trade_type ? trade.trade_type.toUpperCase() : '—' },
    { label: 'Volume', value: trade.volume != null ? trade.volume : '—' },
    { label: 'Open Price', value: formatPrice(trade.open_price) },
    { label: 'Close Price', value: formatPrice(trade.close_price) },
    { label: 'Duration', value: formatDuration(trade.hold_duration_minutes) },
    {
      label: 'Net PnL',
      value: formatPnl(trade.net_pnl),
      valueClass: pnlColorClass(trade.net_pnl),
    },
  ]

  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-60 -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
      <div className="rounded-lg bg-white text-left shadow-xl ring-1 ring-slate-200">
        {hasFlags && (
          <div className="rounded-t-lg border-b border-rose-200 bg-rose-100 px-3 py-2">
            <p className="text-xs font-bold uppercase tracking-wide text-rose-700">
              {flags.map(formatFlagName).join(' · ')}
            </p>
          </div>
        )}

        <dl
          className={`grid grid-cols-2 gap-x-3 gap-y-1.5 px-3 py-2.5 text-xs ${
            hasFlags ? '' : 'rounded-lg'
          }`}
        >
          {rows.map(({ label, value, valueClass = 'text-slate-800' }) => (
            <div key={label} className="contents">
              <dt className="text-slate-500">{label}</dt>
              <dd className={`font-medium ${valueClass}`}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div
        className="absolute left-1/2 top-full -translate-x-1/2 border-[6px] border-transparent border-t-white drop-shadow-sm"
        aria-hidden="true"
      />
    </div>
  )
}

export default function TradeSequenceStrip({ trades = [] }) {
  return (
    <div className="flex flex-wrap gap-3 py-4">
      {trades.map((trade, index) => {
        const hasFlags = (trade.flags ?? []).length > 0

        return (
          <div
            key={trade.position_id ?? index}
            className="group relative flex items-center justify-center"
          >
            <div
              className={`h-4 w-4 cursor-default rounded-full ${dotColor(trade.is_winner)}`}
            />
            {hasFlags && (
              <div className="absolute -bottom-2 w-4 border-b-2 border-dotted border-rose-500" />
            )}
            <TradeTooltip trade={trade} />
          </div>
        )
      })}
    </div>
  )
}
