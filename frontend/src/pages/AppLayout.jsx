import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ArrowLeftRight, BarChart3, BriefcaseBusiness, LayoutDashboard, LogOut, Target, UserRound } from 'lucide-react'
import { useAuth } from '../auth.jsx'
import { Avatar, Logo, ThemeToggle } from '../ui.jsx'

const links = [['/app', 'Dashboard', LayoutDashboard, true], ['/app/holdings', 'Holdings', BriefcaseBusiness], ['/app/transactions', 'Transactions', ArrowLeftRight],
  ['/app/reports', 'Reports', BarChart3], ['/app/goals', 'Goals', Target], ['/app/profile', 'Profile', UserRound]]

export default function AppLayout() {
  const { user, avatar, logout } = useAuth(); const nav = useNavigate()
  return <div className="shell"><aside className="side"><Logo to="/app" />
    <nav>{links.map(([to, t, I, end]) => <NavLink key={to} to={to} end={end} className="nav"><I size={18} />{t}</NavLink>)}</nav>
    <div className="who"><div className="me"><Avatar src={avatar} name={user.name} /><div><b>{user.name}</b><small>{user.email}</small></div></div>
      <ThemeToggle /><button className="btn" onClick={() => { logout(); nav('/') }}><LogOut size={15} /> Log out</button></div></aside>
    <main className="main"><Outlet /></main></div>
}
