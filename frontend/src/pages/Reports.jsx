import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, Printer } from 'lucide-react'
import api, { errMsg, money } from '../api'
import { useAuth } from '../auth.jsx'
import { Alert, Empty } from '../ui.jsx'

const tip = { contentStyle: { background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)' }, labelStyle: { color: 'var(--text)' } }
const ax = { stroke: 'var(--muted)', fontSize: 12 }
const cell = c => /^[=+\-@]/.test(c) ? "'" + c : c
function saveCsv(name, rows) {
  const body = rows.map(r => r.map(c => `"${String(typeof c === 'string' ? cell(c) : c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' })); a.download = name; a.click(); URL.revokeObjectURL(a.href)
}
const Metric = ({ t, v, cls }) => <div className="card metric"><span>{t}</span><strong className={cls}>{v}</strong></div>
const Perf = ({ title, rows }) => <div className="card"><h3>{title}</h3>{rows.map(r => <div className="line" key={r.symbol}><span>{r.name}</span><b className={r.return_pct >= 0 ? 'up' : 'down'}>{r.return_pct}%</b></div>)}</div>

export default function Reports() {
  const { user } = useAuth(); const [d, setD] = useState(null); const [err, setErr] = useState('')
  useEffect(() => { api.get('/reports/overview').then(r => setD(r.data)).catch(e => setErr(errMsg(e))) }, [])
  async function txCsv() {
    try { const { data } = await api.get('/transactions'); saveCsv('transactions.csv', [['Date', 'Type', 'Symbol', 'Units', 'Price', 'Note'], ...data.map(t => [t.day, t.type, t.symbol, t.units, t.price, t.note])]) }
    catch (x) { setErr(errMsg(x)) }
  }
  const holdCsv = () => saveCsv('holdings-report.csv', [['Symbol', 'Name', 'Category', 'Invested', 'Value', 'P/L', 'Return %', 'Weight %'], ...d.by_holding.map(h => [h.symbol, h.name, h.category, h.invested, h.value, h.pl, h.return_pct, h.weight])])
  if (err) return <Alert>{err}</Alert>
  if (!d) return <p className="muted">Building your report…</p>
  if (!d.by_holding.length) return <div><h1>Reports</h1><Empty title="Nothing to report yet" text="Add a holding and your reports will appear here." to="/app/holdings?add=1" cta="Add holding" /></div>
  const cmp = d.rebalance.map(r => ({ name: r.category, Current: r.current_pct, Target: r.target_pct }))
  return <div>
    <div className="printonly"><h1>Fortilio portfolio report</h1><p>{user.name} · {new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</p></div>
    <div className="head noprint"><h1>Reports</h1><div className="row">
      <button className="btn" onClick={holdCsv}><Download size={15} /> Holdings CSV</button><button className="btn" onClick={txCsv}><Download size={15} /> Transactions CSV</button>
      <button className="btn primary" onClick={() => window.print()}><Printer size={15} /> Download PDF</button></div></div>
    <p className="muted noprint">In the print dialog choose "Save as PDF". Figures use the prices you entered.</p>
    <div className="metrics"><Metric t="Portfolio value" v={money(d.total_value)} />
      <Metric t="Unrealized P/L" v={money(d.unrealized_pl)} cls={d.unrealized_pl >= 0 ? 'up' : 'down'} />
      <Metric t="Realized P/L" v={money(d.realized_pl)} cls={d.realized_pl >= 0 ? 'up' : 'down'} />
      <Metric t="XIRR (annualized)" v={d.xirr_pct == null ? 'Needs 30+ days' : d.xirr_pct + '%'} cls={d.xirr_pct >= 0 ? 'up' : 'down'} /></div>
    <div className="cols2">
      <div className="card"><h3>Return by holding (%)</h3><ResponsiveContainer width="100%" height={240}><BarChart data={d.by_holding}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="symbol" {...ax} /><YAxis {...ax} width={40} /><Tooltip {...tip} /><Bar dataKey="return_pct" name="Return %">{d.by_holding.map(h => <Cell key={h.symbol} fill={h.return_pct >= 0 ? 'var(--green)' : 'var(--red)'} />)}</Bar></BarChart></ResponsiveContainer></div>
      <div className="card"><h3>Monthly buys and sells</h3>{d.monthly.length ? <ResponsiveContainer width="100%" height={240}><BarChart data={d.monthly}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="month" {...ax} /><YAxis {...ax} width={55} tickFormatter={v => `${Math.round(v / 1000)}k`} /><Tooltip {...tip} formatter={v => money(v)} /><Legend /><Bar dataKey="bought" name="Bought" fill="var(--accent)" /><Bar dataKey="sold" name="Sold" fill="var(--red)" /></BarChart></ResponsiveContainer> : <p className="muted">No transactions yet.</p>}</div></div>
    <div className="cols2">
      <div className="card"><h3>Allocation: current vs target {d.risk_label && <span className="badge">{d.risk_label}</span>}</h3>
        <ResponsiveContainer width="100%" height={240}><BarChart data={cmp}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" {...ax} /><YAxis {...ax} width={40} unit="%" /><Tooltip {...tip} /><Legend /><Bar dataKey="Current" fill="var(--accent)" /><Bar dataKey="Target" fill="var(--muted)" /></BarChart></ResponsiveContainer></div>
      <div className="card"><h3>Rebalancing planner</h3><p className="muted">Moves that would bring you to typical ranges for your risk profile. Educational only, not advice.</p>
        {d.rebalance.map(r => <div className="line" key={r.category}><span>{r.category} ({r.current_pct}% → {r.target_pct}%)</span><b className={r.action === 'BUY' ? 'up' : 'down'}>{r.action} {money(r.amount)}</b></div>)}</div></div>
    <div className="cols2"><Perf title="Best performers" rows={d.best} /><Perf title="Weakest performers" rows={d.worst} /></div>
    <div className="card tablewrap"><h3>Holdings summary</h3><table><thead><tr><th>Name</th><th>Category</th><th>Invested</th><th>Value</th><th>P/L</th><th>Weight</th></tr></thead><tbody>
      {d.by_holding.map(h => <tr key={h.symbol}><td>{h.name}</td><td>{h.category}</td><td>{money(h.invested)}</td><td>{money(h.value)}</td><td className={h.pl >= 0 ? 'up' : 'down'}>{money(h.pl)} ({h.return_pct}%)</td><td>{h.weight}%</td></tr>)}</tbody></table></div></div>
}
