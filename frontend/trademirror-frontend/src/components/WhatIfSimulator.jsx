import { useState } from 'react'

function sumPnl(trades) {
  return (trades ?? []).reduce((total, trade) => total + (Number(trade?.net_pnl) || 0), 0)
}

function calcWinRate(trades) {
  const list = trades ?? []
  if (list.length === 0) return 0
  const wins = list.filter((t) => t.is_winner === true).length
  return wins / list.length
}

function formatPnl(value) {
  if (value >= 0) return `+$${value.toFixed(2)}`
  return `-$${Math.abs(value).toFixed(2)}`
}

function formatWinRate(rate) {
  return `${(rate * 100).toFixed(1)}%`
}

export default function WhatIfSimulator({ trades = [] }) {
  const [removeRevenge, setRemoveRevenge] = useState(false)

  const safeTrades = trades ?? []

  const actualPnl = sumPnl(safeTrades)
  const actualWinRate = calcWinRate(safeTrades)

  const simulatedTrades = removeRevenge
    ? safeTrades.filter((t) => !(t.flags ?? []).includes('post_loss'))
    : safeTrades

  const simulatedPnl = sumPnl(simulatedTrades)
  const simulatedWinRate = calcWinRate(simulatedTrades)

  const pnlDelta = simulatedPnl - actualPnl
  const showRecovery = removeRevenge && simulatedPnl > actualPnl

  const displayPnl = removeRevenge ? simulatedPnl : actualPnl
  const displayWinRate = removeRevenge ? simulatedWinRate : actualWinRate

  return (
    <div className="mb-5 rounded-xl border border-slate-200 bg-white p-6 text-slate-800 shadow-sm">
      <div className="mb-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="text-center sm:text-left">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            What-if simulator
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Model how performance changes when emotional patterns are removed
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRemoveRevenge((prev) => !prev)}
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
            removeRevenge
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-slate-200 bg-slate-50 hover:border-slate-300'
          }`}
        >
          <span
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
              removeRevenge ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                removeRevenge ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </span>
          <span className="text-sm font-medium text-slate-700">Remove Revenge Trades</span>
        </button>
      </div>

      <div className="mx-auto max-w-md text-center">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Net PnL</p>
            <p
              className={`mt-2 text-3xl font-bold ${
                displayPnl >= 0 ? 'text-slate-900' : 'text-rose-600'
              }`}
            >
              {formatPnl(displayPnl)}
            </p>
            {removeRevenge && (
              <p className="mt-1 text-sm text-slate-400 line-through">
                {formatPnl(actualPnl)}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Win Rate</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {formatWinRate(displayWinRate)}
            </p>
            {removeRevenge && (
              <p className="mt-1 text-sm text-slate-400 line-through">
                {formatWinRate(actualWinRate)}
              </p>
            )}
          </div>

          <p className="text-xs text-slate-400">
            {removeRevenge ? (
              <>
                {simulatedTrades.length} trades simulated
                {safeTrades.length > simulatedTrades.length && (
                  <> · {safeTrades.length - simulatedTrades.length} revenge trades removed</>
                )}
              </>
            ) : (
              <>{safeTrades.length} trades</>
            )}
          </p>
        </div>

        {showRecovery && (
          <span className="mt-4 inline-block rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-600">
            +${pnlDelta.toFixed(2)} recovered by avoiding emotional trading
          </span>
        )}
      </div>
    </div>
  )
}
