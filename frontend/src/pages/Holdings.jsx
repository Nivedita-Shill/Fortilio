import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import api, { errMsg, money, num } from '../api'
import { Alert, CATEGORIES, Empty, Field } from '../ui.jsx'

const blank = { name: '', symbol: '', category: CATEGORIES[0], units: '', average_cost: '', current_price: '', purchase_date: '' }
export default function Holdings() {
  const [sp] = useSearchParams(); const [rows, setRows] = useState(null); const [open, setOpen] = useState(sp.get('add') === '1')
  const [f, setF] = useState(blank); const [err, setErr] = useState(''); const [q, setQ] = useState(''); const [cat, setCat] = useState('All')
  const [edit, setEdit] = useState(null); const [price, setPrice] = useState('')
  const load = useCallback(() => api.get('/holdings', { params: { search: q, category: cat } }).then(r => setRows(r.data)).catch(e => setErr(errMsg(e))), [q, cat])
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t) }, [load])
  async function add(e) {
    e.preventDefault(); setErr('')
    try { await api.post('/holdings', { ...f, purchase_date: f.purchase_date || null, units: +f.units, average_cost: +f.average_cost, current_price: +f.current_price }); setF(blank); setOpen(false); load() }
    catch (x) { setErr(errMsg(x)) }
  }
  const savePrice = async id => { try { await api.put(`/holdings/${id}/price`, { current_price: +price }); setEdit(null); load() } catch (x) { setErr(errMsg(x)) } }
  const del = async h => { if (confirm(`Delete ${h.symbol} and its transactions? This cannot be undone.`)) { try { await api.delete(`/holdings/${h.id}`); load() } catch (x) { setErr(errMsg(x)) } } }
  const set = k => e => setF({ ...f, [k]: e.target.value })
  return <div><div className="head"><h1>Holdings</h1><button className="btn primary" onClick={() => setOpen(!open)}><Plus size={16} /> Add holding</button></div><Alert>{err}</Alert>
    {open && <form className="card" onSubmit={add}><h3>New holding</h3><p className="muted">Enter what you own today. Average cost is your total buy price per unit; current price is the latest NAV or price.</p>
      <div className="three"><Field label="Name"><input required value={f.name} onChange={set('name')} placeholder="Nifty 50 Index Fund" /></Field>
        <Field label="Symbol" hint="Short unique code"><input required pattern="[A-Za-z0-9\-_.]{1,20}" value={f.symbol} onChange={set('symbol')} placeholder="NIFTY50" /></Field>
        <Field label="Category"><select value={f.category} onChange={set('category')}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Units held"><input type="number" step="any" min="0.0001" required value={f.units} onChange={set('units')} /></Field>
        <Field label="Average cost (₹/unit)"><input type="number" step="any" min="0.01" required value={f.average_cost} onChange={set('average_cost')} /></Field>
        <Field label="Current price (₹/unit)"><input type="number" step="any" min="0.01" required value={f.current_price} onChange={set('current_price')} /></Field>
        <Field label="Purchase date" hint="Optional. Improves XIRR accuracy"><input type="date" max={new Date().toISOString().slice(0, 10)} value={f.purchase_date} onChange={set('purchase_date')} /></Field></div>
      <div className="row"><button className="btn primary">Save holding</button><button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button></div></form>}
    <div className="row"><input className="search" placeholder="Search name or symbol" value={q} onChange={e => setQ(e.target.value)} />
      <select value={cat} onChange={e => setCat(e.target.value)}><option>All</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
    {rows && !rows.length ? <Empty title="No holdings yet" text="Add the funds, ETFs or gold you own to start tracking." /> :
      <div className="card tablewrap"><table><thead><tr><th>Name</th><th>Category</th><th>Units</th><th>Avg cost</th><th>Price</th><th>Value</th><th>P/L</th><th /></tr></thead><tbody>
        {rows?.map(h => <tr key={h.id}><td><b>{h.name}</b><small>{h.symbol}</small></td><td>{h.category}</td><td>{num(h.units)}</td><td>{money(h.average_cost)}</td>
          <td>{edit === h.id ? <span className="inl"><input type="number" step="any" value={price} onChange={e => setPrice(e.target.value)} /><button className="btn" onClick={() => savePrice(h.id)}>Save</button></span> : <button className="link" onClick={() => { setEdit(h.id); setPrice(h.current_price) }}>{money(h.current_price)} ✎</button>}</td>
          <td>{money(h.current_value)}</td><td className={h.profit_loss >= 0 ? 'up' : 'down'}>{money(h.profit_loss)} ({h.return_percent}%)</td>
          <td><button className="icon" aria-label={`Delete ${h.symbol}`} onClick={() => del(h)}><Trash2 size={16} /></button></td></tr>)}</tbody></table></div>}</div>
}
