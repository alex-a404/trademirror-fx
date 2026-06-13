import { useState } from 'react'
import ClientsTable from './ClientsTable'
import GroupCard from './GroupCard'
import useCopy from './useCopy'

export default function BrokerAdmin({
  data,
  sessionId = 'demo',
  onViewClient = null,
}) {
  const [activeTab, setActiveTab] = useState('groups')
  const [expandedGroups, setExpanded] = useState(() =>
    new Set(data?.groups?.[0]?.dimension ? [data.groups[0].dimension] : []),
  )
  const { copiedKey, copy } = useCopy()

  if (!data) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-red-500">Broker data is unavailable.</p>
      </div>
    )
  }

  function toggleGroup(dimension) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(dimension)) next.delete(dimension)
      else next.add(dimension)
      return next
    })
  }

  const inGroups = data.groups.reduce((s, g) => s + g.client_count, 0)
  const noSignal = data.no_signal_clients?.length ?? 0
  const excluded = data.excluded_clients?.length ?? 0
  const total = inGroups + noSignal + excluded

  const summaryCards = [
    { label: 'Clients processed', value: total },
    { label: 'In behavioral groups', value: inGroups },
    { label: 'No prominent signal', value: noSignal },
    { label: 'Excluded', value: excluded },
  ]

  return (
    <div className="mx-auto max-w-3xl px-5 py-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Client intelligence</h1>
          <p className="mt-0.5 text-xs text-gray-400">
            {total} clients · {data.groups.length} behavioral{' '}
            {data.groups.length === 1 ? 'group' : 'groups'} identified
          </p>
        </div>
        <span className="text-[10px] text-gray-300">Powered by TradeMirror</span>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-2">
        {summaryCards.map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-gray-50 p-3.5">
            <div className="mb-1.5 text-[10px] leading-snug text-gray-400">{label}</div>
            <div className="text-[22px] font-medium text-gray-900">{value}</div>
          </div>
        ))}
      </div>

      <div className="mb-5 flex gap-0 border-b border-gray-200">
        {[
          { id: 'groups', label: 'Groups' },
          { id: 'clients', label: 'Clients' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`border-b-2 px-4 pb-2.5 pt-0 text-[13px] transition-colors focus:outline-none ${
              activeTab === tab.id
                ? 'border-gray-900 font-medium text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'groups' && (
        <div>
          {data.groups.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-400">No behavioral groups found.</p>
              <p className="mt-1 text-xs text-gray-400">
                At least 3 clients with sufficient trade history are needed for population
                analysis.
              </p>
            </div>
          ) : (
            data.groups.map((group) => (
              <GroupCard
                key={group.dimension}
                group={group}
                isExpanded={expandedGroups.has(group.dimension)}
                onToggle={() => toggleGroup(group.dimension)}
                sessionId={sessionId}
                copiedKey={copiedKey}
                copy={copy}
              />
            ))
          )}

          {noSignal > 0 && (
            <div className="mt-2 rounded-xl bg-gray-50 px-4 py-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[13px] font-medium text-gray-700">
                    No prominent signal — {noSignal}{' '}
                    {noSignal === 1 ? 'client' : 'clients'}
                  </span>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    No significant behavioral deviation detected. Standard engagement is
                    appropriate.
                  </p>
                </div>
                <span className="ml-4 shrink-0 text-[11px] text-gray-400">
                  {data.no_signal_clients.join(', ')}
                </span>
              </div>
            </div>
          )}

          {excluded > 0 && (
            <p className="mt-3 px-1 text-[11px] text-gray-400">
              {excluded} {excluded === 1 ? 'client' : 'clients'} excluded — insufficient
              trade history for population analysis ({data.excluded_clients.join(', ')}).
            </p>
          )}
        </div>
      )}

      {activeTab === 'clients' && (
        <ClientsTable
          clientSignals={data.client_signals}
          noSignalClients={data.no_signal_clients}
          excludedClients={data.excluded_clients}
          onViewClient={onViewClient}
        />
      )}
    </div>
  )
}
