import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { errMsg } from '../api'
import { useAuth } from '../auth.jsx'
import { Alert, Field, Logo } from '../ui.jsx'

function Shell({ title, sub, children, foot }) {
  return <div className="authwrap"><div className="card authcard"><Logo /><h1>{title}</h1><p className="muted">{sub}</p>{children}<p className="muted foot2">{foot}</p></div></div>
}

export function Login() {
  const [f, setF] = useState({ email: '', password: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const { login } = useAuth(); const nav = useNavigate()
  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    try { const { data } = await api.post('/auth/login', f); login(data.token, data.user); nav(data.user.onboarded ? '/app' : '/onboarding') }
    catch (x) { setErr(errMsg(x)) } finally { setBusy(false) }
  }
  return <Shell title="Welcome back" sub="Log in to see your portfolio." foot={<>New here? <Link to="/register">Create an account</Link></>}>
    <form onSubmit={submit}><Alert>{err}</Alert>
      <Field label="Email"><input type="email" required autoFocus placeholder="name@company.com" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></Field>
      <Field label="Password"><input type="password" required value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></Field>
      <button className="btn primary block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button></form>
  </Shell>
}

export function Register() {
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const { login } = useAuth(); const nav = useNavigate()
  async function submit(e) {
    e.preventDefault(); setErr('')
    if (f.password !== f.confirm) return setErr('Passwords do not match.')
    setBusy(true)
    try { const { data } = await api.post('/auth/register', { name: f.name, email: f.email, password: f.password }); login(data.token, data.user); nav('/onboarding') }
    catch (x) { setErr(errMsg(x)) } finally { setBusy(false) }
  }
  const set = k => e => setF({ ...f, [k]: e.target.value })
  return <Shell title="Create your account" sub="Takes under a minute. Setup comes next." foot={<>Already registered? <Link to="/login">Log in</Link></>}>
    <form onSubmit={submit}><Alert>{err}</Alert>
      <Field label="Full name"><input required minLength={2} autoFocus value={f.name} onChange={set('name')} /></Field>
      <Field label="Email"><input type="email" required value={f.email} onChange={set('email')} /></Field>
      <Field label="Password" hint="At least 8 characters."><input type="password" required minLength={8} value={f.password} onChange={set('password')} /></Field>
      <Field label="Confirm password"><input type="password" required value={f.confirm} onChange={set('confirm')} /></Field>
      <button className="btn primary block" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button></form>
  </Shell>
}
