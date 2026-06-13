import clientData from '../data/clientA.json'
import InsightCard from './InsightCard'
import PatienceRatioVisual from './PatienceRatioVisual'
import TradeSequenceStrip from './TradeSequenceStrip'

export default function ClientDashboard() {
  const { client_id: clientId, metrics, trades } = clientData

  return (
    <div className="min-h-screen bg-slate-50 px-6 pt-10 pb-16 text-left">
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
      </div>
    </div>
  )
}
