import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'

export const Field = ({ label, hint, children }) => (
  <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
)
export const Alert = ({ children, kind = 'error' }) => children ? <div className={`alert ${kind}`}>{children}</div> : null
export const Empty = ({ title, text, to, cta }) => (
  <div className="card empty"><h3>{title}</h3><p>{text}</p>{to && <Link className="btn primary" to={to}>{cta}</Link>}</div>
)
export const Logo = ({ to = '/' }) => <Link to={to} className="logo"><span>F</span><b>Fortilio</b></Link>
export const CATEGORIES = ['Equity Funds', 'Debt Funds', 'Gold', 'Other']
export const Avatar = ({ src, name, size = '' }) => src
  ? <img className={`avatar ${size}`} src={src} alt="" />
  : <div className={`avatar ${size}`} aria-hidden="true">{(name || '?')[0].toUpperCase()}</div>

export function ThemeToggle() {
  const [t, setT] = useState(document.documentElement.dataset.theme || 'dark')
  const flip = () => {
    const n = t === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = n; localStorage.setItem('fs_theme', n); setT(n)
  }
  return <button className="btn noprint" onClick={flip} aria-label="Switch between day and night view">
    {t === 'dark' ? <Sun size={16} /> : <Moon size={16} />}{t === 'dark' ? 'Day view' : 'Night view'}</button>
}
