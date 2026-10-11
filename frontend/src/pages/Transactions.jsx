import { useEffect, useState } from 'react'
import api, { errMsg, money } from '../api'
import { Alert, Empty, Field } from '../ui.jsx'

const today = () => new Date().toISOString().slice(0, 10)
export default function Transactions() {
  const [hs, setHs] = useState(null); const [tx, setTx] = useState([]); const [err, setErr] = useState(''); const [ok, setOk] = useState('')
  const [f, setF] = useState({ holding_id: '', type: 'BUY', units: '', price: '', day: today(), note: '' })
  const load = () => Promise.all([api.get('/holdings'), api.get('/transactions')]).then(([h, t]) => { setHs(h.data); setTx(t.data); setF(x => ({ ...x, holding_id: x.holding_id || h.data[0]?.id || '' })) }).catch(e => setErr(errMsg(e)))
  useEffect(() => { load() }, [])
  async function submit(e) {
    e.preventDefault(); setErr(''); setOk('')
    try { await api.post('/transactions', { ...f, holding_id: +f.holding_id, units: +f.units, price: +f.price }); setOk('Transaction recorded. Units and average cost are updated.'); setF({ ...f, units: '', price: '', note: '' }); load() }
    catch (x) { setErr(errMsg(x)) }
  }
  const set = k => e => setF({ ...f, [k]: e.target.value })
  if (hs && !hs.length) return <div><h1>Transactions</h1><Empty title="Add a holding first" text="Transactions are recorded against a holding." to="/app/holdings?add=1" cta="Add holding" /></div>
  return <div><h1>Transactions</h1><Alert>{err}</Alert><Alert kind="ok">{ok}</Alert>
    <form className="card" onSubmit={submit}><h3>Record a buy or sell</h3><p className="muted">Buys update your average cost automatically. Sells reduce units.</p>
      <div className="three"><Field label="Holding"><select value={f.holding_id} onChange={set('holding_id')}>{hs?.map(h => <option key={h.id} value={h.id}>{h.name} ({h.symbol})</option>)}</select></Field>
        <Field label="Type"><select value={f.type} onChange={set('type')}><option>BUY</option><option>SELL</option></select></Field>
        <Field label="Date"><input type="date" max={today()} required value={f.day} onChange={set('day')} /></Field>
        <Field label="Units"><input type="number" step="any" min="0.0001" required value={f.units} onChange={set('units')} /></Field>
        <Field label="Price (₹/unit)"><input type="number" step="any" min="0.01" required value={f.price} onChange={set('price')} /></Field>
        <Field label="Note (optional)"><input maxLength={200} value={f.note} onChange={set('note')} /></Field></div>
      <button className="btn primary">Record transaction</button></form>
    <div className="card tablewrap"><h3>History</h3><table><thead><tr><th>Date</th><th>Type</th><th>Symbol</th><th>Units</th><th>Price</th><th>Note</th></tr></thead><tbody>
      {tx.map(t => <tr key={t.id}><td>{t.day}</td><td className={t.type === 'BUY' ? 'up' : 'down'}>{t.type}</td><td>{t.symbol}</td><td>{t.units}</td><td>{money(t.price)}</td><td className="muted">{t.note}</td></tr>)}</tbody></table></div></div>
}
