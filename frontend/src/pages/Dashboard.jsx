import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Check } from 'lucide-react'
import api, { errMsg, money } from '../api'
import { useAuth } from '../auth.jsx'
import { Alert } from '../ui.jsx'

const COLORS = ['#7c8cff', '#46c8b7', '#f3b861', '#ee8d9a']
const Metric = ({ t, v, cls }) => <div className="card metric"><span>{t}</span><strong className={cls}>{v}</strong></div>

export default function Dashboard() {
  const { user } = useAuth(); const [d, setD] = useState(null); const [err, setErr] = useState('')
  useEffect(() => {
    Promise.all(['/summary', '/allocation', '/history', '/insights', '/transactions'].map(u => api.get(u)))
      .then(([s, a, h, i, t]) => setD({ s: s.data, a: a.data, h: h.data, i: i.data, tx: t.data })).catch(e => setErr(errMsg(e)))
  }, [])
  if (err) return <Alert>{err}</Alert>
  if (!d) return <p className="muted">Loading your portfolio…</p>
  const { s } = d; const up = s.profit_loss >= 0
  if (!s.holdings_count) return <div><h1>Welcome, {user.name.split(' ')[0]}</h1>
    <div className="card"><h3>Finish setting up</h3><p className="muted">Your account is ready. Add your first investment to see charts and returns.</p>
      <ul className="check">{[['Create your account', 1], ['Complete your profile and risk questions', 1], ['Add your first holding', 0], ['Record a transaction', 0]].map(([t, ok]) => <li key={t} className={ok ? 'done' : ''}><span>{ok ? <Check size={14} /> : ''}</span>{t}</li>)}</ul>
      <Link className="btn primary" to="/app/holdings?add=1">Add your first holding</Link></div></div>
  const hist = d.h.map(p => ({ ...p, label: new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }))
  return <div><h1>Dashboard</h1><p className="muted">{s.data_note}</p>
    <div className="metrics"><Metric t="Invested" v={money(s.invested_value)} /><Metric t="Current value" v={money(s.current_value)} />
      <Metric t="Profit / loss" v={money(s.profit_loss)} cls={up ? 'up' : 'down'} /><Metric t="Return" v={`${s.return_percent}%`} cls={up ? 'up' : 'down'} /></div>
    <div className="cols"><div className="card"><h3>Portfolio value over time</h3>
      {hist.length < 2 ? <p className="muted">History builds each time you update a price or record a transaction. Check back after your next update.</p> :
        <ResponsiveContainer width="100%" height={250}><AreaChart data={hist}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="label" stroke="var(--muted)" fontSize={12} /><YAxis stroke="var(--muted)" fontSize={12} width={60} tickFormatter={v => `${Math.round(v / 1000)}k`} /><Tooltip formatter={v => money(v)} contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)' }} /><Area dataKey="value" stroke="#8998ff" fill="#8998ff33" /></AreaChart></ResponsiveContainer>}</div>
      <div className="card"><h3>Allocation</h3><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={d.a} dataKey="value" nameKey="category" innerRadius={50} outerRadius={80}>{d.a.map((_, i) => <Cell key={i} fill={COLORS[i % 4]} />)}</Pie><Tooltip formatter={v => money(v)} contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)' }} /></PieChart></ResponsiveContainer>
        <div className="legend">{d.a.map((x, i) => <span key={x.category}><i style={{ background: COLORS[i % 4] }} />{x.category}</span>)}</div></div></div>
    <div className="card"><h3>Insights {d.i.risk_label && <span className="badge">{d.i.risk_label} profile</span>}</h3>
      {d.i.messages.map(m => <p key={m}>{m}</p>)}<small className="muted">{d.i.disclaimer}</small></div>
    <div className="card"><h3>Recent transactions</h3>{d.tx.slice(0, 5).map(t => <div className="line" key={t.id}><span><b className={t.type === 'BUY' ? 'up' : 'down'}>{t.type}</b> {t.symbol}</span><span>{t.units} @ {money(t.price)}</span><span className="muted">{t.day}</span></div>)}</div></div>
}
