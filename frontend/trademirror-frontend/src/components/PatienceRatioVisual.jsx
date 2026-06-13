function formatDuration(minutes) {
  if (!minutes) return '—'
  if (minutes < 60) return `${Math.round(minutes)} min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default function PatienceRatioVisual({ avgWinner, avgLoser, patienceRatio }) {
  const maxHold = Math.max(avgWinner, avgLoser, 1)
  const winnerPct = Math.max((avgWinner / maxHold) * 100, 2)
  const loserPct = Math.max((avgLoser / maxHold) * 100, 2)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-4 text-sm font-medium">Hold time comparison</div>
      <div className="mb-3">
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="text-gray-500">Avg winner held</span>
          <span className="font-medium text-emerald-600">{formatDuration(avgWinner)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded bg-gray-100">
          <div
            className="h-full rounded bg-emerald-500"
            style={{ width: `${winnerPct}%` }}
          />
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="text-gray-500">Avg loser held</span>
          <span className="font-medium text-red-600">{formatDuration(avgLoser)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded bg-gray-100">
          <div
            className="h-full rounded bg-red-500"
            style={{ width: `${loserPct}%` }}
          />
        </div>
      </div>
      {patienceRatio != null && (
        <p className="mt-3 text-[11px] text-gray-400">
          Patience ratio: {patienceRatio.toFixed(2)}
        </p>
      )}
    </div>
  )
}

const SESSION_ORDER = ['London', 'New York', 'Asia', 'Late']
const BAR_HEIGHT = 60

export function SessionWinRate({ sessionStats = {} }) {
  const sessions = SESSION_ORDER.map((key) => ({
    key,
    data: sessionStats[key] ?? null,
  }))

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 text-sm font-medium">Win rate by session</div>
      {Object.keys(sessionStats).length === 0 ? (
        <p className="mt-4 text-xs text-gray-400">
          Insufficient trades per session (need ≥ 10).
        </p>
      ) : (
        <>
          <div className="mb-1 flex gap-2">
            {sessions.map(({ key, data }) => (
              <div
                key={key}
                className="flex-1 text-center text-[10px] font-medium"
                style={{
                  color: !data ? '#9ca3af' : data.win_rate >= 0.5 ? '#059669' : '#dc2626',
                }}
              >
                {data ? `${(data.win_rate * 100).toFixed(0)}%` : '—'}
              </div>
            ))}
          </div>
          <div className="flex items-end gap-2" style={{ height: BAR_HEIGHT }}>
            {sessions.map(({ key, data }) => {
              const h = data ? Math.max(Math.round(data.win_rate * BAR_HEIGHT), 5) : 5
              const bg = !data ? '#f3f4f6' : data.win_rate >= 0.5 ? '#d1fae5' : '#fee2e2'
              return (
                <div
                  key={key}
                  className="flex-1 rounded-t-sm"
                  style={{ height: h, background: bg }}
                />
              )
            })}
          </div>
          <div className="mt-1 flex gap-2">
            {sessions.map(({ key, data }) => (
              <div
                key={key}
                className="flex-1 text-center text-[10px]"
                style={{ color: data ? '#6b7280' : '#9ca3af' }}
              >
                {key}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
