import ClientDashboard from './components/ClientDashboard'
import BrokerDashboard from './pages/BrokerDashboard'

export default function App() {
  const path = window.location.pathname

  if (path === '/broker-dashboard') {
    return (
      <div className="min-h-screen bg-slate-50">
        <BrokerDashboard />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ClientDashboard />
    </div>
  )
}
