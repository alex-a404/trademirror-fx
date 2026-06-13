import { useState, useEffect } from 'react'
import BrokerAdmin from './BrokerAdmin'
import ClientView  from './ClientView'

const API_BASE   = 'http://localhost:8000'
const BROKER_NAME = 'Vertex FX'

// Nav items — 'Admin' is the active one when in broker view
const NAV_ITEMS = ['Overview', 'My trades', 'Performance', 'Academy', 'Admin']

export default function App() {
  // 'broker' | 'client'
  const [view,           setView]    = useState('broker')
  const [clientId,       setClient]  = useState(null)
  const [clientAnalysis, setAnalysis] = useState(null)
  const [clientLoading,  setClientLoading] = useState(false)
  const [clientError,    setClientError]   = useState(null)

  // When drilling into a client, fetch their analysis before rendering ClientView.
  // ClientView expects a non-null `analysis` prop (or it auto-fetches client_B).
  useEffect(() => {
    if (!clientId) return
    setAnalysis(null)
    setClientError(null)
    setClientLoading(true)

    fetch(`${API_BASE}/demo/client/${clientId}`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json() })
      .then(data => { setAnalysis(data); setClientLoading(false) })
      .catch(e  => { setClientError(e.message); setClientLoading(false) })
  }, [clientId])

  function handleViewClient(id) {
    setClient(id)
    setView('client')
  }

  function handleBackToBroker() {
    setView('broker')
    setClient(null)
    setAnalysis(null)
  }

  // Which nav item reads as "active"
  const activeNavItem = view === 'broker' ? 'Admin' : 'Performance'

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">

      {/* ── Nav ────────────────────────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-gray-200 px-5 py-2.5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-[5px] bg-blue-50 flex items-center justify-center
                            text-[9px] font-semibold text-blue-700 select-none">
              VX
            </div>
            <span className="text-sm font-medium">{BROKER_NAME}</span>
          </div>

          {/* Nav items */}
          <div className="flex items-center gap-5">
            {NAV_ITEMS.map(item => (
              <button
                key={item}
                onClick={item === 'Admin' ? handleBackToBroker : undefined}
                className={`text-xs pb-0.5 transition-colors select-none focus:outline-none ${
                  item === activeNavItem
                    ? 'font-medium text-gray-900 border-b-[1.5px] border-gray-900'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200
                        flex items-center justify-center text-[10px] font-medium text-gray-500 select-none">
          JD
        </div>
      </nav>

      {/* ── Broker admin view ────────────────────────────────────────────────── */}
      {view === 'broker' && (
        <BrokerAdmin
          brokerName={BROKER_NAME}
          onViewClient={handleViewClient}
        />
      )}

      {/* ── Individual client view ────────────────────────────────────────────── */}
      {view === 'client' && (
        <>
          {/* Back breadcrumb */}
          <div className="max-w-5xl mx-auto px-5 pt-4">
            <button
              onClick={handleBackToBroker}
              className="flex items-center gap-1.5 text-xs text-gray-400
                         hover:text-gray-700 transition-colors mb-1"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="1.5">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back to admin
            </button>
          </div>

          {/* Loading / error states before ClientView mounts */}
          {clientLoading && (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-gray-400">Loading {clientId}…</p>
            </div>
          )}

          {clientError && (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-red-500">
                Could not load client ({clientError}). Is the backend running?
              </p>
            </div>
          )}

          {/* Render ClientView only once analysis is ready */}
          {!clientLoading && !clientError && clientAnalysis && (
            <ClientView
              analysis={clientAnalysis}
              brokerName={BROKER_NAME}
              clientLabel={clientId}
            />
          )}
        </>
      )}
    </div>
  )
}
