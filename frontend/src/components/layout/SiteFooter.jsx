import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../brand/Logo';
import { EXPLORE_LINKS } from './SiteNav';
import './SiteFooter.css';

const SiteFooter = () => (
  <footer className="site-footer">
    <div className="site-footer__inner container">
      <div className="site-footer__brand">
        <Link to="/" className="site-footer__logo" aria-label="Mr. Guide home"><Logo /></Link>
        <p>
          Plan routes, discover authentic places and travel with trusted local guides
          across Sri Lanka.
        </p>
      </div>

      <nav className="site-footer__cols" aria-label="Footer">
        <div>
          <h2 className="site-footer__heading">Explore</h2>
          <ul>
            {EXPLORE_LINKS.map((l) => <li key={l.to}><Link to={l.to}>{l.label}</Link></li>)}
          </ul>
        </div>
        <div>
          <h2 className="site-footer__heading">Guides</h2>
          <ul>
            <li><Link to="/guides">Find a guide</Link></li>
            <li><Link to="/guides/register">Become a guide</Link></li>
            <li><Link to="/guide/dashboard">Guide dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="site-footer__heading">Mr. Guide</h2>
          <ul>
            <li><Link to="/about">About us</Link></li>
            <li><Link to="/login">Log in</Link></li>
            <li><Link to="/register">Create an account</Link></li>
          </ul>
        </div>
      </nav>
    </div>

    <div className="site-footer__base container">
      <p>&copy; {new Date().getFullYear()} Mr. Guide. Made for travellers in Sri Lanka.</p>
    </div>
  </footer>
);

export default SiteFooter;
