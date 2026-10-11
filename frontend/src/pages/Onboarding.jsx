import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { errMsg } from '../api'
import { useAuth } from '../auth.jsx'
import { Alert, Field, Logo } from '../ui.jsx'

const INCOME = ['Below ₹5 lakh', '₹5–10 lakh', '₹10–25 lakh', '₹25–50 lakh', 'Above ₹50 lakh']
const QS = [
  ['How soon will you need most of this money?', ['Within 3 years', '3–7 years', '7–12 years', 'More than 12 years']],
  ['If your portfolio fell 20% in a month, you would…', ['Sell everything', 'Sell some', 'Hold and wait', 'Buy more']],
  ['How stable is your income?', ['Unstable', 'Somewhat stable', 'Stable', 'Stable, with a large savings buffer']],
  ['Which describes your main aim?', ['Protect my capital', 'Earn steady income', 'Balanced growth', 'Maximum long-term growth']],
]

export default function Onboarding() {
  const [step, setStep] = useState(1); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const [p, setP] = useState({ phone: '', city: '', occupation: '', income_range: INCOME[1], horizon_years: 5 })
  const [ans, setAns] = useState([0, 0, 0, 0])
  const [g, setG] = useState({ name: '', target_amount: '', target_date: '', monthly_contribution: '' })
  const { user, setUser } = useAuth(); const nav = useNavigate()
  useEffect(() => { api.get('/profile').then(r => r.data && setP(x => ({ ...x, ...r.data }))).catch(() => {}) }, [])

  const next1 = e => { e.preventDefault(); setErr(''); setStep(2) }
  const next2 = () => ans.includes(0) ? setErr('Please answer every question.') : (setErr(''), setStep(3))
  async function finish(skipGoal) {
    setErr(''); setBusy(true)
    try {
      await api.put('/profile', { ...p, horizon_years: Number(p.horizon_years), risk_answers: ans })
      if (!skipGoal) {
        if (!g.name || !g.target_amount || !g.target_date) { setBusy(false); return setErr('Fill in the goal, or choose "Skip for now".') }
        await api.post('/goals', { ...g, target_amount: Number(g.target_amount), monthly_contribution: Number(g.monthly_contribution || 0) })
      }
      setUser({ ...user, onboarded: true }); nav('/app')
    } catch (x) { setErr(errMsg(x)) } finally { setBusy(false) }
  }
  const pset = k => e => setP({ ...p, [k]: e.target.value })
  return <div className="authwrap"><div className="card wizard"><Logo to="/onboarding" />
    <div className="progress">{['About you', 'Risk comfort', 'First goal'].map((t, i) => <div key={t} className={step > i ? 'on' : ''}><span>{i + 1}</span>{t}</div>)}</div>
    <Alert>{err}</Alert>
    {step === 1 && <form onSubmit={next1}><h2>Tell us about you</h2><p className="muted">Hi {user?.name?.split(' ')[0]}, this helps tailor your dashboard.</p>
      <div className="two"><Field label="Mobile number"><input required pattern="[0-9+\-\s]{7,20}" value={p.phone} onChange={pset('phone')} placeholder="+91 98765 43210" /></Field>
        <Field label="City"><input required minLength={2} value={p.city} onChange={pset('city')} /></Field>
        <Field label="Occupation"><input required minLength={2} value={p.occupation} onChange={pset('occupation')} /></Field>
        <Field label="Annual income"><select value={p.income_range} onChange={pset('income_range')}>{INCOME.map(i => <option key={i}>{i}</option>)}</select></Field>
        <Field label="Investment horizon (years)"><input type="number" min="1" max="40" required value={p.horizon_years} onChange={pset('horizon_years')} /></Field></div>
      <button className="btn primary">Continue</button></form>}
    {step === 2 && <div><h2>How comfortable are you with risk?</h2><p className="muted">Four quick questions. We use this to compare your mix with typical ranges.</p>
      {QS.map(([q, opts], i) => <fieldset key={q}><legend>{i + 1}. {q}</legend>
        <div className="opts">{opts.map((o, j) => <label key={o} className={ans[i] === j + 1 ? 'opt sel' : 'opt'}><input type="radio" name={'q' + i} checked={ans[i] === j + 1} onChange={() => setAns(ans.map((a, k) => k === i ? j + 1 : a))} />{o}</label>)}</div></fieldset>)}
      <div className="row"><button className="btn" onClick={() => setStep(1)}>Back</button><button className="btn primary" onClick={next2}>Continue</button></div></div>}
    {step === 3 && <div><h2>Set your first goal</h2><p className="muted">For example a home down payment or retirement corpus. You can add more later.</p>
      <div className="two"><Field label="Goal name"><input value={g.name} onChange={e => setG({ ...g, name: e.target.value })} placeholder="Home down payment" /></Field>
        <Field label="Target amount (₹)"><input type="number" min="1" value={g.target_amount} onChange={e => setG({ ...g, target_amount: e.target.value })} /></Field>
        <Field label="Target date"><input type="date" min={new Date().toISOString().slice(0, 10)} value={g.target_date} onChange={e => setG({ ...g, target_date: e.target.value })} /></Field>
        <Field label="Planned monthly saving (₹)"><input type="number" min="0" value={g.monthly_contribution} onChange={e => setG({ ...g, monthly_contribution: e.target.value })} /></Field></div>
      <div className="row"><button className="btn" onClick={() => setStep(2)}>Back</button><button className="btn" disabled={busy} onClick={() => finish(true)}>Skip for now</button><button className="btn primary" disabled={busy} onClick={() => finish(false)}>{busy ? 'Saving…' : 'Finish setup'}</button></div></div>}
  </div></div>
}
