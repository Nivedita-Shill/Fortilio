import { Link } from 'react-router-dom'
import { BarChart3, Target, ShieldCheck, ListChecks } from 'lucide-react'
import { Logo, ThemeToggle } from '../ui.jsx'

const features = [
  [BarChart3, 'See everything in one place', 'Track mutual funds, ETFs and gold with invested value, current value and returns.'],
  [Target, 'Plan around goals', 'Set a target and date, and see how far your portfolio is from it.'],
  [ListChecks, 'Record every transaction', 'Log buys and sells; average cost is recalculated for you.'],
  [ShieldCheck, 'Your data stays yours', 'Passwords are salted and hashed, and every record is tied to your account.'],
]
const steps = ['Create your account', 'Tell us about you and your risk comfort', 'Add your first investment', 'Watch your dashboard grow']

export default function Landing() {
  return <div className="landing">
    <header className="topbar"><Logo />
      <nav><a href="#features">Features</a><a href="#how">How it works</a><ThemeToggle /><Link className="btn" to="/login">Log in</Link><Link className="btn primary" to="/register">Get started</Link></nav>
    </header>
    <section className="hero">
      <p className="eyebrow">YOUR PORTFOLIO. YOUR FORTUNE.</p>
      <h1>Know where your money stands, and where it's heading.</h1>
      <p className="lead">Fortilio helps you track investments, record transactions and measure progress toward your goals. You enter the prices, so you stay in control.</p>
      <div className="row"><Link className="btn primary lg" to="/register">Create free account</Link><Link className="btn lg" to="/login">I have an account</Link></div>
    </section>
    <section id="features" className="section"><h2>Everything you need to stay on top</h2>
      <div className="grid4">{features.map(([I, t, d]) => <article className="card" key={t}><I size={22} className="ico" /><h3>{t}</h3><p>{d}</p></article>)}</div>
    </section>
    <section id="how" className="section"><h2>Up and running in four steps</h2>
      <ol className="steps">{steps.map((s, i) => <li key={s}><span>{i + 1}</span>{s}</li>)}</ol>
      <div className="row center-row"><Link className="btn primary lg" to="/register">Start now</Link></div>
    </section>
    <footer className="foot">Fortilio does not provide investment advice or live market data. Figures reflect values you enter.</footer>
  </div>
}
