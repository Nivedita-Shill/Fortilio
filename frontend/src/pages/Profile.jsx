import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { errMsg } from '../api'
import { useAuth } from '../auth.jsx'
import { Alert, Avatar, Field } from '../ui.jsx'

function toSquare(file) {
  return new Promise((res, rej) => {
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return rej(new Error('Choose a PNG, JPG or WebP image.'))
    if (file.size > 5e6) return rej(new Error('Image must be under 5 MB.'))
    const img = new Image()
    img.onload = () => {
      const s = 256, m = Math.min(img.width, img.height), c = document.createElement('canvas'); c.width = c.height = s
      c.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s)
      URL.revokeObjectURL(img.src); res(c.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => rej(new Error('Could not read that image.'))
    img.src = URL.createObjectURL(file)
  })
}

export default function Profile() {
  const { user, avatar, setAvatar } = useAuth(); const [p, setP] = useState(null); const [err, setErr] = useState(''); const [ok, setOk] = useState('')
  const file = useRef()
  useEffect(() => { api.get('/profile').then(r => setP(r.data)).catch(e => setErr(errMsg(e))) }, [])
  async function save(e) {
    e.preventDefault(); setErr(''); setOk('')
    try { const { data } = await api.put('/profile', { phone: p.phone, city: p.city, occupation: p.occupation, income_range: p.income_range, horizon_years: +p.horizon_years }); setP(data); setOk('Profile saved.') }
    catch (x) { setErr(errMsg(x)) }
  }
  async function upload(e) {
    const f = e.target.files[0]; if (!f) return; setErr(''); setOk('')
    try { const { data } = await api.put('/profile/avatar', { data_url: await toSquare(f) }); setAvatar(data.data_url); setOk('Profile picture updated.') }
    catch (x) { setErr(x.response ? errMsg(x) : x.message) } finally { e.target.value = '' }
  }
  async function remove() { try { await api.delete('/profile/avatar'); setAvatar(null); setOk('Profile picture removed.') } catch (x) { setErr(errMsg(x)) } }
  if (!p) return <Alert>{err}</Alert>
  const set = k => e => setP({ ...p, [k]: e.target.value })
  return <div><h1>Profile</h1><Alert>{err}</Alert><Alert kind="ok">{ok}</Alert>
    <div className="card profilehead"><Avatar src={avatar} name={user.name} size="lg" />
      <div><h3>{user.name}</h3><p className="muted">{user.email}</p>
        <div className="row"><input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={upload} />
          <button className="btn" onClick={() => file.current.click()}>Upload picture</button>{avatar && <button className="btn" onClick={remove}>Remove</button>}</div>
        <small>PNG, JPG or WebP, up to 5 MB. Cropped to a square automatically.</small></div></div>
    <form className="card" onSubmit={save}><h3>Your details</h3>
      <div className="three"><Field label="Mobile"><input required value={p.phone} onChange={set('phone')} /></Field><Field label="City"><input required value={p.city} onChange={set('city')} /></Field>
        <Field label="Occupation"><input required value={p.occupation} onChange={set('occupation')} /></Field><Field label="Annual income"><input value={p.income_range} onChange={set('income_range')} /></Field>
        <Field label="Horizon (years)"><input type="number" min="1" max="40" value={p.horizon_years} onChange={set('horizon_years')} /></Field></div>
      <button className="btn primary">Save changes</button></form>
    <div className="card"><h3>Risk profile: <span className="badge">{p.risk_label}</span></h3><p className="muted">Score {p.risk_score} of 16. Retake the questions if your situation changes.</p><Link className="btn" to="/onboarding">Retake questionnaire</Link></div></div>
}
