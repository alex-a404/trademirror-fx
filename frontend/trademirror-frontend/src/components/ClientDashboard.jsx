import clientData from '../data/clientA.json'
import InsightCard from './InsightCard'
import PatienceRatioVisual from './PatienceRatioVisual'
import TradeSequenceStrip from './TradeSequenceStrip'

function formatResult(isWinner) {
  if (isWinner === true) return 'Win'
  if (isWinner === false) return 'Loss'
  return 'Breakeven'
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

export default function ClientDashboard() {
  const { client_id: clientId, metrics, trades } = clientData
  const recentTrades = trades.slice(0, 5)

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-left">
      <div className="mx-auto max-w-6xl space-y-10">
        <header>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Client Analysis
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">{clientId}</h1>
        </header>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <InsightCard
            title="Patience Ratio"
            value={metrics.patience_ratio.toFixed(2)}
            statusColor="red"
            insight="Winners are closed in minutes while losers are held for hours — a classic patience inversion."
          />
          <InsightCard
            title="Trade Frequency"
            value={`${metrics.trade_frequency.toFixed(1)}/day`}
            statusColor="amber"
            insight="Steady daily activity without overtrading, but exit timing remains the main behavioral risk."
          />
          <InsightCard
            title="Post-Loss Trading"
            value={`${Math.round(metrics.emotional_chain_rate * 100)}%`}
            statusColor="green"
            insight="Rarely re-enters within two hours of a loss, so emotional chaining is not the primary concern here."
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Hold Duration Comparison</h2>
          <p className="mt-1 text-sm text-slate-500">
            Average time in winning vs losing trades
          </p>
          <div className="mt-6">
            <PatienceRatioVisual
              avgWinnerHoldMinutes={18}
              avgLoserHoldMinutes={280}
            />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Trade Sequence</h2>
          <p className="mt-1 text-sm text-slate-500">
            Chronological wins and losses — dotted marker below flagged trades
          </p>
          <div className="mt-6">
            <TradeSequenceStrip trades={trades} />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Recent Trades</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Symbol</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Session</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((trade) => (
                  <tr
                    key={trade.position_id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {trade.symbol}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-700">
                      {trade.trade_type}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{trade.session}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDuration(trade.hold_duration_minutes)}
                    </td>
                    <td
                      className={`px-4 py-3 font-medium ${
                        trade.is_winner === true
                          ? 'text-emerald-600'
                          : trade.is_winner === false
                            ? 'text-rose-600'
                            : 'text-slate-600'
                      }`}
                    >
                      {formatResult(trade.is_winner)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
