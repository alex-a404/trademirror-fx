function formatMinutes(minutes) {
  if (minutes == null || Number.isNaN(minutes)) return '—'
  return `${Math.round(minutes)} min`
}

export default function PatienceRatioVisual({
  avgWinnerHoldMinutes = 0,
  avgLoserHoldMinutes = 0,
}) {
  const maxMinutes = Math.max(avgWinnerHoldMinutes, avgLoserHoldMinutes, 1)
  const winnerWidth = `${(avgWinnerHoldMinutes / maxMinutes) * 100}%`
  const loserWidth = `${(avgLoserHoldMinutes / maxMinutes) * 100}%`

  return (
    <div className="w-full space-y-3">
      <div>
        <p className="mb-1 text-sm font-medium text-slate-700">
          Avg winner hold: {formatMinutes(avgWinnerHoldMinutes)}
        </p>
        <div className="h-4 w-full rounded-full bg-slate-100">
          <div
            className="h-4 rounded-full bg-emerald-500 transition-all"
            style={{ width: winnerWidth }}
          />
        </div>
      </div>

      <div>
        <p className="mb-1 text-sm font-medium text-slate-700">
          Avg loser hold: {formatMinutes(avgLoserHoldMinutes)}
        </p>
        <div className="h-4 w-full rounded-full bg-slate-100">
          <div
            className="h-4 rounded-full bg-rose-500 transition-all"
            style={{ width: loserWidth }}
          />
        </div>
      </div>
    </div>
  )
}
