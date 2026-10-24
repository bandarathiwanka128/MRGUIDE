import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  ChevronDown, Compass, Map, Route, CalendarRange, Sparkles, Users, Info,
  Sun, Moon, Menu, X, LogOut, LayoutDashboard, BadgeCheck, Navigation, ShieldCheck,
} from 'lucide-react';
import Logo from '../brand/Logo';
import './SiteNav.css';

export const EXPLORE_LINKS = [
  { to: '/search', label: 'Map search', desc: 'Find any place and get directions', icon: Map },
  { to: '/shortest-path', label: 'Shortest route', desc: 'Order your stops for the quickest trip', icon: Route },
  { to: '/trip-planner', label: 'Trip planner', desc: 'Build a day-by-day itinerary with AI help', icon: CalendarRange },
  { to: '/authentic', label: 'Authentic Sri Lanka', desc: 'Local tips and places from people who live here', icon: Sparkles },
];

const EXPLORE_PATHS = EXPLORE_LINKS.map((l) => l.to);
const isExplorePath = (path) => EXPLORE_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

function useClickOutside(ref, onOutside, active) {
  useEffect(() => {
    if (!active) return undefined;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onOutside(); };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [ref, onOutside, active]);
}

const SiteNav = ({ user, onLogout, darkMode, onToggleTheme, overHero, assistantButton }) => {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [indicator, setIndicator] = useState({ x: 0, w: 0, visible: false });

  const linksRef = useRef(null);
  const exploreRef = useRef(null);
  const accountRef = useRef(null);
  const drawerRef = useRef(null);
  const drawerToggleRef = useRef(null);

  const activeTrip = Boolean(user && localStorage.getItem('mrguide_active_trip'));
  const exploreActive = isExplorePath(location.pathname);

  // Compact, more opaque bar once the page scrolls
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close every menu on navigation
  useEffect(() => {
    setExploreOpen(false);
    setAccountOpen(false);
    setDrawerOpen(false);
  }, [location.pathname]);

  // Slide the active indicator under the current top-level item
  const measure = useCallback(() => {
    const host = linksRef.current;
    if (!host) return;
    const active = host.querySelector('[data-nav-active="true"]');
    if (!active) { setIndicator((s) => ({ ...s, visible: false })); return; }
    const hostBox = host.getBoundingClientRect();
    const box = active.getBoundingClientRect();
    setIndicator({ x: box.left - hostBox.left, w: box.width, visible: true });
  }, []);

  useLayoutEffect(() => { measure(); }, [measure, location.pathname, user]);
  useEffect(() => {
    window.addEventListener('resize', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const closeExplore = useCallback(() => setExploreOpen(false), []);
  const closeAccount = useCallback(() => setAccountOpen(false), []);
  useClickOutside(exploreRef, closeExplore, exploreOpen);
  useClickOutside(accountRef, closeAccount, accountOpen);

  // Escape closes whatever is open and returns focus to its trigger
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (exploreOpen) { setExploreOpen(false); exploreRef.current?.querySelector('button')?.focus(); }
      if (accountOpen) { setAccountOpen(false); accountRef.current?.querySelector('button')?.focus(); }
      if (drawerOpen) { setDrawerOpen(false); drawerToggleRef.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [exploreOpen, accountOpen, drawerOpen]);

  // Drawer: lock page scroll and keep focus inside while open
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = drawerRef.current;
    const focusables = () => panel.querySelectorAll('a[href], button:not([disabled])');
    const raf = requestAnimationFrame(() => focusables()[0]?.focus());
    const trap = (e) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    panel.addEventListener('keydown', trap);
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prev;
      panel.removeEventListener('keydown', trap);
    };
  }, [drawerOpen]);

  // Arrow-key movement inside the open dropdown menus
  const onMenuKeyDown = (e) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const items = [...e.currentTarget.querySelectorAll('[role="menuitem"]')];
    if (!items.length) return;
    e.preventDefault();
    const i = items.indexOf(document.activeElement);
    let next = 0;
    if (e.key === 'ArrowDown') next = (i + 1) % items.length;
    if (e.key === 'ArrowUp') next = (i - 1 + items.length) % items.length;
    if (e.key === 'End') next = items.length - 1;
    items[next].focus();
  };

  const openMenuFromKey = (setter) => (e) => {
    if (e.key !== 'ArrowDown') return;
    e.preventDefault();
    const wrap = e.currentTarget.parentElement;
    setter(true);
    requestAnimationFrame(() => wrap?.querySelector('[role="menuitem"]')?.focus());
  };

  const ThemeIcon = darkMode ? Sun : Moon;
  const firstName = user?.username || user?.name || 'Traveller';

  return (
    <header
      className={`site-nav${scrolled ? ' is-scrolled' : ''}${overHero ? ' is-floating' : ''}${overHero && !scrolled ? ' is-over-hero' : ''}`}
    >
      <nav className="site-nav__bar container" aria-label="Primary">
        <Link to="/" className="site-nav__brand" aria-label="Mr. Guide home">
          <Logo />
        </Link>

        <ul className="site-nav__links" ref={linksRef}>
          <li>
            <NavLink to="/" end className="site-nav__link" data-nav-active={location.pathname === '/'}>
              Home
            </NavLink>
          </li>
          <li className="site-nav__menu-wrap" ref={exploreRef}>
            <button
              type="button"
              className="site-nav__link site-nav__trigger"
              aria-expanded={exploreOpen}
              aria-haspopup="true"
              aria-controls="explore-menu"
              data-nav-active={exploreActive}
              onClick={() => setExploreOpen((o) => !o)}
              onKeyDown={openMenuFromKey(setExploreOpen)}
            >
              Explore <ChevronDown size={16} aria-hidden="true" className="site-nav__chev" />
            </button>
            <div
              id="explore-menu"
              className={`site-nav__menu site-nav__menu--explore${exploreOpen ? ' is-open' : ''}`}
              role="menu"
              aria-label="Explore tools"
              onKeyDown={onMenuKeyDown}
            >
              {EXPLORE_LINKS.map(({ to, label, desc, icon: Icon }) => (
                <NavLink key={to} to={to} role="menuitem" className="site-nav__menu-item" tabIndex={exploreOpen ? 0 : -1}>
                  <span className="site-nav__menu-icon"><Icon size={18} aria-hidden="true" /></span>
                  <span>
                    <span className="site-nav__menu-label">{label}</span>
                    <span className="site-nav__menu-desc">{desc}</span>
                  </span>
                </NavLink>
              ))}
            </div>
          </li>
          <li>
            <NavLink to="/guides" className="site-nav__link" data-nav-active={location.pathname.startsWith('/guides')}>
              Find a guide
            </NavLink>
          </li>
          <li>
            <NavLink to="/about" className="site-nav__link" data-nav-active={location.pathname === '/about'}>
              About
            </NavLink>
          </li>
          <li className="site-nav__indicator-slot" aria-hidden="true">
            <span
              className="site-nav__indicator"
              style={{
                transform: `translateX(${indicator.x}px) scaleX(${indicator.w / 100})`,
                opacity: indicator.visible ? 1 : 0,
              }}
            />
          </li>
        </ul>

        <div className="site-nav__actions">
          {activeTrip && (
            <Link to="/my-trip" className="site-nav__trip">
              <span className="site-nav__trip-dot" aria-hidden="true" />
              <Navigation size={15} aria-hidden="true" />
              <span>Live trip</span>
            </Link>
          )}

          {user?.role === 'admin' && <NavLink to="/admin" className="ui-btn ui-btn--primary ui-btn--sm site-nav__admin-link"><ShieldCheck size={16} aria-hidden="true" /> Admin panel</NavLink>}
          {assistantButton}

          <button
            type="button"
            className="site-nav__icon-btn site-nav__theme-btn"
            onClick={onToggleTheme}
            aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
            title={darkMode ? 'Light theme' : 'Dark theme'}
          >
            <ThemeIcon size={18} aria-hidden="true" key={darkMode ? 'sun' : 'moon'} className="site-nav__theme-icon" />
          </button>

          {user ? (
            <div className="site-nav__menu-wrap site-nav__account" ref={accountRef}>
              <button
                type="button"
                className="site-nav__avatar-btn"
                aria-expanded={accountOpen}
                aria-haspopup="true"
                aria-controls="account-menu"
                onClick={() => setAccountOpen((o) => !o)}
                onKeyDown={openMenuFromKey(setAccountOpen)}
              >
                <span className="site-nav__avatar" aria-hidden="true">{firstName.charAt(0).toUpperCase()}</span>
                <span className="site-nav__avatar-name">{firstName}</span>
                <ChevronDown size={16} aria-hidden="true" className="site-nav__chev" />
              </button>
              <div
                id="account-menu"
                className={`site-nav__menu site-nav__menu--account${accountOpen ? ' is-open' : ''}`}
                role="menu"
                aria-label="Account"
                onKeyDown={onMenuKeyDown}
              >
                {user?.role === 'admin' && <Link to="/admin" role="menuitem" className="site-nav__menu-item site-nav__menu-item--row" tabIndex={accountOpen ? 0 : -1}><ShieldCheck size={17} aria-hidden="true" /> Admin panel</Link>}
                <p className="site-nav__menu-heading">Signed in as <strong>{firstName}</strong></p>
                <Link to="/guide/dashboard" role="menuitem" className="site-nav__menu-item site-nav__menu-item--row" tabIndex={accountOpen ? 0 : -1}>
                  <LayoutDashboard size={17} aria-hidden="true" /> Guide dashboard
                </Link>
                <Link to="/guides/register" role="menuitem" className="site-nav__menu-item site-nav__menu-item--row" tabIndex={accountOpen ? 0 : -1}>
                  <BadgeCheck size={17} aria-hidden="true" /> Become a guide
                </Link>
                <hr className="site-nav__menu-sep" />
                <button type="button" role="menuitem" className="site-nav__menu-item site-nav__menu-item--row site-nav__menu-item--danger" onClick={onLogout} tabIndex={accountOpen ? 0 : -1}>
                  <LogOut size={17} aria-hidden="true" /> Log out
                </button>
              </div>
            </div>
          ) : (
            <div className="site-nav__auth">
              <Link to="/login" className="ui-btn ui-btn--ghost ui-btn--sm site-nav__login">Log in</Link>
              <Link to="/register" className="ui-btn ui-btn--primary ui-btn--sm">Join free</Link>
            </div>
          )}

          <button
            type="button"
            ref={drawerToggleRef}
            className="site-nav__icon-btn site-nav__drawer-toggle"
            aria-expanded={drawerOpen}
            aria-controls="mobile-drawer"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        </div>
      </nav>

      {/* Mobile drawer — inside a clipping layer so the closed drawer never widens the page */}
      <div className={`site-drawer-layer${drawerOpen ? ' is-open' : ''}`}>
      <div
        className={`site-drawer__scrim${drawerOpen ? ' is-open' : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      <div
        id="mobile-drawer"
        ref={drawerRef}
        className={`site-drawer${drawerOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        inert={drawerOpen ? undefined : ''}
      >
        <div className="site-drawer__head">
          <Logo />
          <button type="button" className="site-nav__icon-btn" aria-label="Close menu" onClick={() => { setDrawerOpen(false); drawerToggleRef.current?.focus(); }}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="site-drawer__body">
          {activeTrip && (
            <Link to="/my-trip" className="site-drawer__trip">
              <span className="site-nav__trip-dot" aria-hidden="true" />
              <span><strong>Live trip in progress</strong><small>Return to live tracking</small></span>
            </Link>
          )}

          <NavLink to="/" end className="site-drawer__link"><Compass size={19} aria-hidden="true" /> Home</NavLink>

          <p className="site-drawer__group">Explore</p>
          {EXPLORE_LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className="site-drawer__link"><Icon size={19} aria-hidden="true" /> {label}</NavLink>
          ))}

          <p className="site-drawer__group">Guides</p>
          <NavLink to="/guides" end className="site-drawer__link"><Users size={19} aria-hidden="true" /> Find a guide</NavLink>
          {user && (
            <>
              <NavLink to="/guide/dashboard" className="site-drawer__link"><LayoutDashboard size={19} aria-hidden="true" /> Guide dashboard</NavLink>
              <NavLink to="/guides/register" className="site-drawer__link"><BadgeCheck size={19} aria-hidden="true" /> Become a guide</NavLink>
            </>
          )}

          {user?.role === 'admin' && <NavLink to="/admin" className="site-drawer__link"><ShieldCheck size={19} aria-hidden="true" /> Admin panel</NavLink>}
          <p className="site-drawer__group">Mr. Guide</p>
          <NavLink to="/about" className="site-drawer__link"><Info size={19} aria-hidden="true" /> About us</NavLink>
          <button type="button" className="site-drawer__link" onClick={onToggleTheme}>
            <ThemeIcon size={19} aria-hidden="true" /> {darkMode ? 'Light theme' : 'Dark theme'}
          </button>
        </div>

        <div className="site-drawer__foot">
          {user ? (
            <>
              <p className="site-drawer__user">Signed in as <strong>{firstName}</strong></p>
              <button type="button" className="ui-btn ui-btn--danger ui-btn--block" onClick={onLogout}>
                <LogOut size={17} aria-hidden="true" /> Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/register" className="ui-btn ui-btn--primary ui-btn--block ui-btn--lg">Join free</Link>
              <Link to="/login" className="ui-btn ui-btn--outline ui-btn--block ui-btn--lg">Log in</Link>
            </>
          )}
        </div>
      </div>
      </div>
    </header>
  );
};

export default SiteNav;
