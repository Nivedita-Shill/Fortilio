import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import Landing from './pages/Landing.jsx'
import { Login, Register } from './pages/Auth.jsx'
import Onboarding from './pages/Onboarding.jsx'
import AppLayout from './pages/AppLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Holdings from './pages/Holdings.jsx'
import Transactions from './pages/Transactions.jsx'
import Goals from './pages/Goals.jsx'
import Profile from './pages/Profile.jsx'
import Reports from './pages/Reports.jsx'

function Guard({ children, needOnboarded = true }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="center">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (needOnboarded && !user.onboarded) return <Navigate to="/onboarding" replace />
  return children
}
function Public({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="center">Loading…</div>
  return user ? <Navigate to={user.onboarded ? '/app' : '/onboarding'} replace /> : children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Public><Login /></Public>} />
      <Route path="/register" element={<Public><Register /></Public>} />
      <Route path="/onboarding" element={<Guard needOnboarded={false}><Onboarding /></Guard>} />
      <Route path="/app" element={<Guard><AppLayout /></Guard>}>
        <Route index element={<Dashboard />} />
        <Route path="holdings" element={<Holdings />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="goals" element={<Goals />} />
        <Route path="reports" element={<Reports />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
