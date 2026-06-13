import { useEffect, useState } from 'react'
import BrokerAdmin from '../components/broker/BrokerAdmin'

const NAV_ITEMS = ['Overview', 'Clients', 'Intelligence', 'Academy', 'Support']

export default function BrokerDashboard({
  brokerName = 'Vertex FX',
  onViewClient = null,
}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('http://localhost:8000/demo/broker')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((json) => {
        setData(json)
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
        <p className="mt-4 text-sm text-gray-500">Clustering client population...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <p className="text-sm text-red-500">
          Could not load broker session ({error}). Is the backend running on port 8000?
        </p>
      </div>
    )
  }

  if (!data) return null

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
            {NAV_ITEMS.map((item) => (
              <span
                key={item}
                className={`select-none pb-0.5 text-xs transition-colors ${
                  item === 'Intelligence'
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
          AM
        </div>
      </nav>

      <BrokerAdmin data={data} onViewClient={onViewClient} />
    </div>
  )
}
