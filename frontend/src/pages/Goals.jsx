import { useEffect, useState } from 'react'
import { Trash2, X } from 'lucide-react'
import api, { errMsg, money } from '../api'
import { Alert, Empty, Field } from '../ui.jsx'

const blank = { name: '', target_amount: '', target_date: '', monthly_contribution: '' }

function LinkEditor({ g, holdings, save }) {
  const [hid, setHid] = useState(''); const [pct, setPct] = useState('')
  const own = Object.fromEntries(g.links.map(l => [l.holding_id, l.percent]))
  const avail = h => Math.round((h.free_percent + (own[h.id] || 0)) * 100) / 100
  const options = holdings.filter(h => avail(h) > 0)
  const toPayload = ls => ls.map(l => ({ holding_id: l.holding_id, percent: l.percent }))
  const add = async e => {
    e.preventDefault()
    const rest = g.links.filter(l => l.holding_id !== +hid)
    await save(g, [...toPayload(rest), { holding_id: +hid, percent: +pct }]); setPct('')
  }
  return <div className="linkbox"><b>Linked investments</b>
    {!g.links.length && <p className="muted">Nothing linked yet. Link holdings to count them toward this goal.</p>}
    {g.links.map(l => <div className="line" key={l.holding_id}>
      <span>{l.name} <small>{l.symbol} · {l.percent}% of this holding</small></span>
      <span>{money(l.value)} <button className="icon" aria-label={`Unlink ${l.symbol}`} onClick={() => save(g, toPayload(g.links.filter(x => x.holding_id !== l.holding_id)))}><X size={15} /></button></span></div>)}
    {options.length ? <form className="row" onSubmit={add}>
      <select required value={hid} onChange={e => { setHid(e.target.value); const h = holdings.find(x => x.id === +e.target.value); setPct(h ? avail(h) : '') }}>
        <option value="">Choose holding</option>{options.map(h => <option key={h.id} value={h.id}>{h.name} ({avail(h)}% free)</option>)}</select>
      <input type="number" step="any" min="0.01" max="100" required placeholder="% to use" value={pct} onChange={e => setPct(e.target.value)} style={{ maxWidth: 120 }} />
      <button className="btn">Link</button></form>
      : <p className="muted">{holdings.length ? 'All your holdings are fully linked to goals.' : 'Add a holding first to link it here.'}</p>}
  </div>
}

export default function Goals() {
  const [data, setData] = useState(null); const [err, setErr] = useState(''); const [f, setF] = useState(blank)
  const load = () => api.get('/goals/progress').then(r => setData(r.data)).catch(e => setErr(errMsg(e)))
  useEffect(() => { load() }, [])
  async function add(e) {
    e.preventDefault(); setErr('')
    try { await api.post('/goals', { ...f, target_amount: +f.target_amount, monthly_contribution: +(f.monthly_contribution || 0) }); setF(blank); load() }
    catch (x) { setErr(errMsg(x)) }
  }
  const save = async (g, links) => { try { await api.put(`/goals/${g.id}/links`, { links }); setErr(''); load() } catch (x) { setErr(errMsg(x)) } }
  const del = async id => { if (confirm('Delete this goal? Linked investments become free again.')) { await api.delete(`/goals/${id}`); load() } }
  const set = k => e => setF({ ...f, [k]: e.target.value })
  const free = data ? data.holdings.reduce((s, h) => s + h.value * h.free_percent / 100, 0) : 0
  return <div><h1>Goals</h1>
    <p className="muted">Each goal counts only the investments you link to it. A holding can be split across goals, up to 100% in total. Projections assume no investment returns.</p><Alert>{err}</Alert>
    <form className="card" onSubmit={add}><h3>New goal</h3><div className="three">
      <Field label="Name"><input required minLength={2} value={f.name} onChange={set('name')} /></Field>
      <Field label="Target amount (₹)"><input type="number" min="1" required value={f.target_amount} onChange={set('target_amount')} /></Field>
      <Field label="Target date"><input type="date" required min={new Date().toISOString().slice(0, 10)} value={f.target_date} onChange={set('target_date')} /></Field>
      <Field label="Monthly saving (₹)"><input type="number" min="0" value={f.monthly_contribution} onChange={set('monthly_contribution')} /></Field></div>
      <button className="btn primary">Add goal</button></form>
    {data && data.holdings.length > 0 && <p className="muted">{money(free)} of your portfolio is not linked to any goal.</p>}
    {data && !data.goals.length ? <Empty title="No goals yet" text="Add a goal above, then link investments to it." /> :
      data?.goals.map(g => {
        const pct = Math.min(100, g.linked_value / g.target_amount * 100)
        const months = Math.max(1, Math.round((new Date(g.target_date) - new Date()) / 2629800000))
        const need = Math.max(0, (g.target_amount - g.linked_value) / months)
        const projected = g.linked_value + g.monthly_contribution * months, gap = g.target_amount - projected
        return <div className="card" key={g.id}>
          <div className="head"><h3>{g.name}</h3><button className="icon" aria-label="Delete goal" onClick={() => del(g.id)}><Trash2 size={16} /></button></div>
          <div className="bar"><div style={{ width: pct + '%' }} /></div>
          <p>{money(g.linked_value)} of {money(g.target_amount)} ({pct.toFixed(1)}%) · by {g.target_date}</p>
          <p className="muted">About {money(need)} per month needed over {months} months. You plan {money(g.monthly_contribution)}: projected {money(projected)}{' '}
            <span className={gap <= 0 ? 'up' : 'down'}>{gap <= 0 ? '(on track)' : `(short by ${money(gap)})`}</span>.</p>
          <LinkEditor g={g} holdings={data.holdings} save={save} />
        </div>
      })}</div>
}
