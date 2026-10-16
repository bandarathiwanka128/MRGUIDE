import React from 'react';
import { Link } from 'react-router-dom';
import { Route, Sparkles, ShieldCheck } from 'lucide-react';
import Logo from '../brand/Logo';
import '../../styles/auth.css';

/* Split layout shared by Login and Register: an editorial panel beside the form. */
const AuthShell = ({ eyebrow, title, subtitle, children, wide = false }) => (
  <div className="auth-shell">
    <aside className="auth-shell__aside" aria-hidden="true">
      <div className="auth-shell__aside-inner">
        <Link to="/" tabIndex={-1} className="auth-shell__logo"><Logo /></Link>
        <p className="auth-shell__quote">
          &ldquo;The best way to see Sri Lanka is with someone who calls it home.&rdquo;
        </p>
        <ul className="auth-shell__perks">
          <li><Route size={18} /> Real routes and multi-stop planning</li>
          <li><Sparkles size={18} /> AI suggestions for every season</li>
          <li><ShieldCheck size={18} /> Trusted local guides and businesses</li>
        </ul>
      </div>
    </aside>

    <section className={`auth-shell__main${wide ? ' auth-shell__main--wide' : ''}`} aria-labelledby="auth-title">
      <div className="auth-card">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 id="auth-title" className="auth-card__title">{title}</h1>
        {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}
        {children}
      </div>
    </section>
  </div>
);

export default AuthShell;
