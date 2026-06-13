import { useState } from 'react'
import { DIMENSION_CONFIG, dimCfg } from './brokerConfig'
import { ConcernBar } from './BrokerPrimitives'

export default function ClientsTable({
  clientSignals,
  noSignalClients,
  excludedClients,
  onViewClient,
}) {
  const [filterDim, setFilterDim] = useState('all')
  const [sortField, setSortField] = useState('concern')

  const allRows = Object.entries(clientSignals).map(([id, s]) => ({ id, ...s }))

  const activeDimensions = [
    ...new Set(allRows.map((r) => r.primary_signal).filter(Boolean)),
  ]

  const filtered = (() => {
    if (filterDim === 'all') return allRows
    if (filterDim === '_nosignal') {
      return allRows.filter((r) => !r.primary_signal && r.sufficient_history)
    }
    if (filterDim === '_excluded') {
      return allRows.filter((r) => !r.sufficient_history)
    }
    return allRows.filter((r) => r.primary_signal === filterDim)
  })()

  const sorted = [...filtered].sort((a, b) => {
    if (sortField === 'concern') {
      return (b.concern_strength || 0) - (a.concern_strength || 0)
    }
    if (sortField === 'id') return a.id.localeCompare(b.id)
    return 0
  })

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="text-sm font-medium text-gray-900">All clients</div>
        <div className="flex gap-2">
          <select
            value={filterDim}
            onChange={(e) => setFilterDim(e.target.value)}
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600"
          >
            <option value="all">All groups</option>
            {activeDimensions.map((d) => (
              <option key={d} value={d}>
                {DIMENSION_CONFIG[d] ? d.replace(/_/g, ' ') : d}
              </option>
            ))}
            {noSignalClients?.length > 0 && (
              <option value="_nosignal">No signal</option>
            )}
            {excludedClients?.length > 0 && (
              <option value="_excluded">Excluded</option>
            )}
          </select>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600"
          >
            <option value="concern">Sort: concern ↓</option>
            <option value="id">Sort: client ID</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '22%' }} />
            <col style={{ width: '30%' }} />
            <col style={{ width: '24%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '14%' }} />
          </colgroup>
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2.5 text-left font-medium text-gray-500">Client ID</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-500">Primary signal</th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-500">Concern</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-500">History</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No clients match this filter.
                </td>
              </tr>
            )}
            {sorted.map((client) => {
              const dim = client.primary_signal
              const cfg = dim ? dimCfg(dim) : null
              const muted = !client.sufficient_history
              const displayName = client.display_name || (dim ? dim : 'No prominent signal')

              return (
                <tr
                  key={client.id}
                  className={`border-t border-gray-100 transition-colors ${
                    !muted ? 'hover:bg-gray-50' : ''
                  }`}
                >
                  <td
                    className={`px-4 py-3 font-medium ${
                      muted ? 'text-gray-400' : 'text-gray-900'
                    }`}
                  >
                    {client.id}
                  </td>
                  <td className="px-4 py-3">
                    {cfg ? (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${cfg.badge}`}
                      >
                        {displayName}
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400">{displayName}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {client.concern_strength > 0 ? (
                      <ConcernBar value={client.concern_strength} />
                    ) : (
                      <span className="float-right pr-7 text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {client.sufficient_history ? (
                      <span className="text-[10px] text-emerald-500">✓</span>
                    ) : (
                      <span className="text-[10px] text-gray-300">low</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {client.sufficient_history && onViewClient && (
                      <button
                        type="button"
                        onClick={() => onViewClient(client.id)}
                        className="text-sm text-gray-300 transition-colors hover:text-gray-600"
                        aria-label={`View ${client.id}`}
                      >
                        →
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
