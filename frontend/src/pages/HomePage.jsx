import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Search, ArrowRight, ArrowUpRight, Pause, Play, Sparkles, Map, Route, CalendarRange, ShieldCheck,
  Users, Smartphone, Waves, Landmark, Leaf, Building2, Mountain, Drama, PawPrint, MapPin,
  CalendarDays, Phone, Navigation, CreditCard, UserCheck, AlertTriangle, Send,
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import useReveal from '../hooks/useReveal';
import './HomePage.css';

/* Hero photography — the two working images from the original slider.
   (Two others were dropped: one returned HTTP 403, one was an 800px collage.) */
const heroSlides = [
  {
    img: 'https://res.cloudinary.com/jerrick/image/upload/d_642250b563292b35f27461a7.png,f_jpg,q_auto,w_1600/637f71bba2f78a001d04492b.jpg',
    alt: 'Lotus Tower lit up over Colombo at dusk',
    place: 'Lotus Tower, Colombo',
    credit: 'Thilina Kaluthotage Photography',
    position: '62% 40%',
  },
  {
    img: 'https://media.licdn.com/dms/image/v2/D5612AQGmIELLsSrSBQ/article-cover_image-shrink_720_1280/B56ZVbc.NmGoAM-/0/1740996077593?e=2147483647&v=beta&t=T3xZ-MIsw6a2u-jNLSAii7U4GLB_czKhpngK5Bn22Ao',
    alt: 'Aerial view of a palm-lined beach and turquoise sea',
    place: 'Sri Lankan coastline',
    credit: null,
    position: '50% 60%',
  },
];
const SLIDE_MS = 7000;

const popularDestinations = [
  { name: 'Sigiriya', query: 'Sigiriya Rock Fortress', region: 'Cultural Triangle', icon: Landmark },
  { name: 'Temple of the Tooth', query: 'Temple of the Tooth Kandy', region: 'Kandy', icon: Landmark },
  { name: 'Galle Fort', query: 'Galle Fort', region: 'South coast', icon: Building2 },
  { name: 'Yala National Park', query: 'Yala National Park', region: 'South-east', icon: PawPrint },
  { name: 'Ella', query: 'Ella Sri Lanka', region: 'Hill country', icon: Mountain },
  { name: 'Colombo hotels', query: 'Colombo hotels', region: 'West coast', icon: Building2 },
];

const examplePrompts = [
  'Best beaches to visit in August',
  'Cultural temples near Kandy',
  'Adventure activities in Ella',
  'Where to see wildlife in Sri Lanka',
  'Best places for photography',
];

const categoryIcons = {
  beach: Waves, temple: Landmark, nature: Leaf, city: Building2,
  adventure: Mountain, culture: Drama, wildlife: PawPrint,
};

const tools = [
  {
    to: '/search', title: 'Map search', icon: Map, size: 'wide',
    text: 'Search any place, compare results and get turn-by-turn directions by car, bike or on foot.',
  },
  {
    to: '/shortest-path', title: 'Shortest route', icon: Route,
    text: 'Add your stops and let Google Maps put them in the quickest order.',
  },
  {
    to: '/trip-planner', title: 'Trip planner', icon: CalendarRange, size: 'tall',
    text: 'Build a multi-day itinerary with weather and an AI-generated day-by-day plan.',
  },
  {
    to: '/authentic', title: 'Authentic Sri Lanka', icon: ShieldCheck,
    text: 'Prices, tips and small businesses shared by verified locals.',
  },
  {
    to: '/guides', title: 'Find a guide', icon: Users, size: 'wide',
    text: 'Book a local guide with distance-based pricing, live tracking and card or QR payment.',
  },
];

/* Restrained pointer tilt for cards on devices with a fine pointer */
function usePointerTilt(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !window.matchMedia) return undefined;
    const ok = window.matchMedia('(hover: hover) and (pointer: fine)').matches
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!ok) return undefined;
    const cards = [...root.querySelectorAll('[data-tilt]')];
    const offs = cards.map((card) => {
      let raf = 0;
      const move = (e) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const r = card.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5;
          const y = (e.clientY - r.top) / r.height - 0.5;
          card.style.setProperty('--rx', `${(-y * 5).toFixed(2)}deg`);
          card.style.setProperty('--ry', `${(x * 6).toFixed(2)}deg`);
          card.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
          card.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`);
        });
      };
      const leave = () => {
        cancelAnimationFrame(raf);
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      };
      card.addEventListener('pointermove', move);
      card.addEventListener('pointerleave', leave);
      return () => {
        card.removeEventListener('pointermove', move);
        card.removeEventListener('pointerleave', leave);
        cancelAnimationFrame(raf);
      };
    });
    return () => offs.forEach((off) => off());
  }, [rootRef]);
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const HomePage = ({ onOpenAssistant }) => {
  const navigate = useNavigate();
  const pageRef = useRef(null);
  const heroRef = useRef(null);
  const aiInputRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState({});
  const [failed, setFailed] = useState({});
  const [paused, setPaused] = useState(false);
  const [heroFocused, setHeroFocused] = useState(false);
  const [reduceMotion] = useState(prefersReducedMotion);

  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState([]);
  const [aiFallback, setAiFallback] = useState(false);
  const [aiError, setAiError] = useState('');

  useReveal(pageRef);
  usePointerTilt(pageRef);

  const usableCount = heroSlides.filter((_, i) => !failed[i]).length;
  const autoplay = !paused && !heroFocused && !reduceMotion && usableCount > 1;

  // Move off a slide whose image failed to load
  useEffect(() => {
    if (!failed[currentSlide]) return;
    const next = heroSlides.findIndex((_, i) => !failed[i]);
    if (next >= 0) setCurrentSlide(next);
  }, [failed, currentSlide]);

  // Slide rotation (pauses on focus, on request and for reduced motion)
  useEffect(() => {
    if (!autoplay) return undefined;
    const t = setInterval(() => {
      setCurrentSlide((prev) => {
        for (let step = 1; step <= heroSlides.length; step += 1) {
          const next = (prev + step) % heroSlides.length;
          if (!failed[next]) return next;
        }
        return prev;
      });
    }, SLIDE_MS);
    return () => clearInterval(t);
  }, [autoplay, failed]);

  // Gentle depth: scroll parallax and pointer drift on the hero image layer
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || reduceMotion) return undefined;
    let raf = 0;
    const fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, window.innerHeight);
        hero.style.setProperty('--scroll', `${(y * 0.22).toFixed(1)}px`);
        hero.style.setProperty('--fade', `${Math.max(0, 1 - y / (window.innerHeight * 0.8)).toFixed(3)}`);
      });
    };
    const onMove = (e) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      hero.style.setProperty('--px', `${(x * -14).toFixed(1)}px`);
      hero.style.setProperty('--py', `${(y * -10).toFixed(1)}px`);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    if (fine) hero.addEventListener('pointermove', onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      hero.removeEventListener('pointermove', onMove);
    };
  }, [reduceMotion]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleQuickSearch = (query) => navigate(`/search?q=${encodeURIComponent(query)}`);

  const handleAiSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();
    const q = aiQuery.trim();
    if (!q || q.length < 5) return;
    setAiLoading(true);
    setAiResults([]);
    setAiError('');
    setAiFallback(false);
    try {
      const res = await axios.post(`${API_BASE_URL}/ai/travel-suggest`, { question: q });
      setAiResults(res.data.suggestions || []);
      setAiFallback(Boolean(res.data.fallback));
    } catch (err) {
      setAiError('We couldn’t get suggestions right now. Check your connection and try again.');
    } finally {
      setAiLoading(false);
    }
  }, [aiQuery]);

  const handleExampleClick = (prompt) => {
    setAiQuery(prompt);
    setAiResults([]);
    setAiError('');
    aiInputRef.current?.focus();
  };

  const slide = heroSlides[currentSlide];
  const heroReady = Object.keys(loaded).length > 0;

  return (
    <div className="home" ref={pageRef}>
      {/* ═══════════ HERO ═══════════ */}
      <section
        className={`hero${heroReady ? ' is-ready' : ''}`}
        ref={heroRef}
        aria-labelledby="hero-title"
        onFocus={() => setHeroFocused(true)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHeroFocused(false); }}
      >
        <div className="hero__media">
          <div className="hero__layer">
            {heroSlides.map((s, i) => (failed[i] ? null : (
              <img
                key={s.img}
                src={s.img}
                alt={i === currentSlide ? s.alt : ''}
                aria-hidden={i === currentSlide ? undefined : true}
                className={`hero__img${i === currentSlide ? ' is-active' : ''}${loaded[i] ? ' is-loaded' : ''}`}
                style={{ objectPosition: s.position }}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                onLoad={() => setLoaded((m) => ({ ...m, [i]: true }))}
                onError={() => setFailed((m) => ({ ...m, [i]: true }))}
              />
            )))}
          </div>
          <div className="hero__scrim" aria-hidden="true" />
        </div>

        <div className="hero__content container">
          <p className="hero__eyebrow"><MapPin size={14} aria-hidden="true" /> Sri Lanka, guided by locals</p>
          <h1 id="hero-title" className="hero__title">
            Find the island <em>the locals</em> know.
          </h1>
          <p className="hero__lead">
            Search places, plan routes and multi-day trips, and travel with a trusted local guide — all in one place.
          </p>

          <form onSubmit={handleSearch} className="hero-search" role="search">
            <label htmlFor="hero-search-input" className="sr-only">Search for places in Sri Lanka</label>
            <Search size={20} aria-hidden="true" className="hero-search__icon" />
            <input
              id="hero-search-input"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Where to? Try Sigiriya or Ella"
              className="hero-search__input"
              autoComplete="off"
              enterKeyHint="search"
            />
            <button type="submit" className="ui-btn ui-btn--primary hero-search__btn">
              <span className="hero-search__btn-label">Search</span> <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>

          <div className="hero__shortcuts" role="group" aria-label="Popular destinations">
            {popularDestinations.slice(0, 5).map((d) => (
              <button key={d.name} type="button" className="hero__chip" onClick={() => handleQuickSearch(d.query)}>
                {d.name}
              </button>
            ))}
          </div>

          <div className="hero__ctas">
            <Link to="/trip-planner" className="hero__cta">Plan a trip <ArrowUpRight size={16} aria-hidden="true" /></Link>
            <Link to="/guides" className="hero__cta">Find a local guide <ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
        </div>

        <div className="hero__footer container">
          <div className="hero__caption">
            <span className="hero__caption-place">{slide.place}</span>
            {slide.credit && <span className="hero__caption-credit">Photo: {slide.credit}</span>}
          </div>
          {usableCount > 1 && (
            <div className="hero__controls">
              <div className="hero__progress" role="group" aria-label="Hero photos">
                {heroSlides.map((s, i) => (failed[i] ? null : (
                  <button
                    key={s.img}
                    type="button"
                    aria-pressed={i === currentSlide}
                    aria-label={`Photo ${i + 1}: ${s.place}`}
                    className={`hero__bar${i === currentSlide ? ' is-active' : ''}${autoplay ? ' is-playing' : ''}`}
                    style={{ '--slide-ms': `${SLIDE_MS}ms` }}
                    onClick={() => setCurrentSlide(i)}
                  >
                    <span key={`${currentSlide}-${autoplay}`} />
                  </button>
                )))}
              </div>
              {!reduceMotion && (
                <button
                  type="button"
                  className="hero__pause"
                  onClick={() => setPaused((p) => !p)}
                  aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
                >
                  {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════ PROMISES ═══════════ */}
      <section className="promises" aria-label="What Mr. Guide gives you">
        <ul className="promises__list container">
          <li className="reveal" style={{ '--reveal-index': 0 }}><Route size={20} aria-hidden="true" /><span><strong>Real routes</strong> from Google Maps</span></li>
          <li className="reveal" style={{ '--reveal-index': 1 }}><Sparkles size={20} aria-hidden="true" /><span><strong>AI suggestions</strong> by Google Gemini</span></li>
          <li className="reveal" style={{ '--reveal-index': 2 }}><Navigation size={20} aria-hidden="true" /><span><strong>Live tracking</strong> on guided trips</span></li>
          <li className="reveal" style={{ '--reveal-index': 3 }}><ShieldCheck size={20} aria-hidden="true" /><span><strong>Free</strong> to explore and plan</span></li>
        </ul>
      </section>

      {/* ═══════════ DESTINATIONS ═══════════ */}
      <section className="home-section destinations" aria-labelledby="dest-title">
        <div className="container">
          <div className="home-section__head reveal">
            <p className="eyebrow">Start somewhere</p>
            <h2 id="dest-title">Popular places to begin your journey</h2>
            <p>Open any of them on the map to see what&rsquo;s nearby, check directions or add them to a trip.</p>
          </div>
          <ul className="destinations__grid">
            {popularDestinations.map(({ name, query, region, icon: Icon }, i) => (
              <li key={name} className="reveal" style={{ '--reveal-index': i }}>
                <button type="button" className="dest-card" data-tilt onClick={() => handleQuickSearch(query)}>
                  <span className="dest-card__index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <span className="dest-card__icon" aria-hidden="true"><Icon size={22} /></span>
                  <span className="dest-card__name">{name}</span>
                  <span className="dest-card__region">{region}</span>
                  <span className="dest-card__go" aria-hidden="true"><ArrowUpRight size={18} /></span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ═══════════ AI PLANNER ═══════════ */}
      <section className="home-section ask" aria-labelledby="ask-title">
        <div className="ask__inner container">
          <div className="ask__intro reveal">
            <p className="eyebrow"><Sparkles size={14} aria-hidden="true" /> Travel assistant</p>
            <h2 id="ask-title">Tell us the trip you&rsquo;re dreaming of.</h2>
            <p>
              Describe a season, a mood or an activity. We check places our local community has added first,
              then ask Google Gemini to fill the gaps.
            </p>
            {onOpenAssistant && (
              <button type="button" className="ask__more" onClick={onOpenAssistant}>
                Open the full assistant <ArrowRight size={16} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="ask__panel reveal" style={{ '--reveal-index': 1 }}>
            <form onSubmit={handleAiSubmit} className="ask__form">
              <label htmlFor="ask-input" className="ask__label">What are you looking for?</label>
              <div className="ask__field">
                <input
                  id="ask-input"
                  ref={aiInputRef}
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="e.g. Best places to visit in August with good weather"
                  className="ask__input"
                  disabled={aiLoading}
                  aria-describedby="ask-hint"
                />
                <button type="submit" className="ui-btn ui-btn--primary ask__submit" disabled={aiLoading || aiQuery.trim().length < 5} aria-label="Get suggestions">
                  {aiLoading ? <span className="ui-spinner" aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
                </button>
              </div>
              <p id="ask-hint" className="ask__hint">At least 5 characters. AI answers can be wrong, so check details before you travel.</p>
            </form>

            <div className="ask__output" aria-live="polite" aria-busy={aiLoading}>
              {aiResults.length === 0 && !aiLoading && !aiError && (
                <div className="ask__examples">
                  <p className="ask__examples-label">Try asking</p>
                  <div className="ask__chips">
                    {examplePrompts.map((p) => (
                      <button key={p} type="button" className="ui-chip" onClick={() => handleExampleClick(p)}>{p}</button>
                    ))}
                  </div>
                </div>
              )}

              {aiLoading && (
                <div className="ask__loading">
                  {[0, 1, 2].map((i) => <div key={i} className="ask__skeleton ui-skeleton" />)}
                  <p>Finding the best places for you…</p>
                </div>
              )}

              {aiError && (
                <div className="ui-alert ui-alert--error" role="alert">
                  <AlertTriangle size={18} aria-hidden="true" />
                  <span>{aiError} <button type="button" className="ask__retry" onClick={() => handleAiSubmit()}>Try again</button></span>
                </div>
              )}

              {aiResults.length > 0 && (
                <>
                  {aiFallback && (
                    <div className="ui-alert ui-alert--warning" role="note">
                      <AlertTriangle size={18} aria-hidden="true" />
                      <span>The AI service is unavailable, so these are popular picks rather than answers to your question.</span>
                    </div>
                  )}
                  <ul className="ask__results">
                    {aiResults.map((place, i) => {
                      const CatIcon = categoryIcons[place.category] || MapPin;
                      const local = place.source === 'database';
                      return (
                        <li key={`${place.name}-${i}`} className={`ask-card${local ? ' ask-card--local' : ''}`} style={{ '--i': i }}>
                          <div className="ask-card__top">
                            <span className="ask-card__cat"><CatIcon size={16} aria-hidden="true" /> {place.category}</span>
                            {local && (
                              <span className="ui-badge ui-badge--blue">
                                {place.db_type === 'business' ? 'Local business' : 'Local expert'}
                              </span>
                            )}
                          </div>
                          <h3 className="ask-card__name">{place.name}</h3>
                          {place.db_type === 'business' && place.added_by && <p className="ask-card__owner">by {place.added_by}</p>}
                          {place.db_type === 'user' && place.expert_name && (
                            <p className="ask-card__owner">{place.expert_title ? `${place.expert_title} · ` : ''}{place.expert_name}</p>
                          )}
                          <p className="ask-card__reason">{place.reason}</p>
                          <div className="ask-card__meta">
                            {place.best_months && <span><CalendarDays size={14} aria-hidden="true" /> Best: {place.best_months}</span>}
                            {place.contact && <span><Phone size={14} aria-hidden="true" /> {place.contact}</span>}
                          </div>
                          <button
                            type="button"
                            className="ask-card__btn"
                            onClick={() => navigate(`/search?q=${encodeURIComponent(place.search_query || place.name)}`)}
                          >
                            View on map <ArrowRight size={16} aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ TOOLS ═══════════ */}
      <section className="home-section tools" aria-labelledby="tools-title">
        <div className="container">
          <div className="home-section__head reveal">
            <p className="eyebrow">Everything for the journey</p>
            <h2 id="tools-title">From the first search to the final fare.</h2>
          </div>

          <ul className="tools__grid">
            {tools.map(({ to, title, text, icon: Icon, size }, i) => (
              <li key={to} className={`tools__cell${size ? ` tools__cell--${size}` : ''} reveal`} style={{ '--reveal-index': i }}>
                <Link to={to} className="tool-card" data-tilt>
                  <span className="tool-card__glow" aria-hidden="true" />
                  <span className="tool-card__icon" aria-hidden="true"><Icon size={24} /></span>
                  <span className="tool-card__body">
                    <span className="tool-card__title">{title}</span>
                    <span className="tool-card__text">{text}</span>
                  </span>
                  <span className="tool-card__go" aria-hidden="true"><ArrowUpRight size={20} /></span>
                  {size === 'tall' && (
                    <svg className="tool-card__art" viewBox="0 0 220 160" aria-hidden="true">
                      <path d="M14 140 C 60 120, 50 70, 100 64 S 170 30, 206 18" className="tool-card__route" />
                      <circle cx="14" cy="140" r="6" className="tool-card__stop" />
                      <circle cx="100" cy="64" r="6" className="tool-card__stop" />
                      <circle cx="206" cy="18" r="7" className="tool-card__end" />
                    </svg>
                  )}
                </Link>
              </li>
            ))}
            <li className="tools__cell reveal" style={{ '--reveal-index': tools.length }}>
              <div className="tool-card tool-card--static">
                <span className="tool-card__icon" aria-hidden="true"><Smartphone size={24} /></span>
                <span className="tool-card__body">
                  <span className="tool-card__title">Mobile apps <span className="ui-badge ui-badge--gold">Coming soon</span></span>
                  <span className="tool-card__text">Android and iOS apps are on the way. Until then, install this site from your browser menu.</span>
                </span>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* ═══════════ GUIDES ═══════════ */}
      <section className="home-section guides-band" aria-labelledby="guides-title">
        <div className="guides-band__inner container">
          <div className="guides-band__copy reveal">
            <p className="eyebrow">Local guides</p>
            <h2 id="guides-title">Travel with someone who knows the way.</h2>
            <p>
              Every guide sets transparent, distance-based prices. You see the estimate before you book,
              follow the trip live, and pay by card or QR code at the end.
            </p>
            <div className="guides-band__actions">
              <Link to="/guides" className="ui-btn ui-btn--primary ui-btn--lg">Find a guide <ArrowRight size={18} aria-hidden="true" /></Link>
              <Link to="/guides/register" className="ui-btn ui-btn--outline ui-btn--lg">Become a guide</Link>
            </div>
          </div>

          <ol className="guides-band__steps">
            <li className="reveal" style={{ '--reveal-index': 0 }}>
              <span className="guides-band__num" aria-hidden="true">1</span>
              <div>
                <h3><UserCheck size={20} aria-hidden="true" /> Choose your guide</h3>
                <p>Compare languages, regions, ratings and price per kilometre.</p>
              </div>
            </li>
            <li className="reveal" style={{ '--reveal-index': 1 }}>
              <span className="guides-band__num" aria-hidden="true">2</span>
              <div>
                <h3><Navigation size={20} aria-hidden="true" /> Track the trip live</h3>
                <p>See your guide&rsquo;s position and trip status in real time.</p>
              </div>
            </li>
            <li className="reveal" style={{ '--reveal-index': 2 }}>
              <span className="guides-band__num" aria-hidden="true">3</span>
              <div>
                <h3><CreditCard size={20} aria-hidden="true" /> Pay at the end</h3>
                <p>The final fare is calculated from the real distance. Pay by card or QR code.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* ═══════════ CLOSING CTA ═══════════ */}
      <section className="home-section closing" aria-labelledby="closing-title">
        <div className="container">
          <div className="closing__card reveal">
            <div className="closing__copy">
              <p className="eyebrow">Authentic Sri Lanka</p>
              <h2 id="closing-title">The best tips aren&rsquo;t in a guidebook.</h2>
              <p>Read what locals share about prices, timings and small businesses — or add your own.</p>
            </div>
            <div className="closing__actions">
              <Link to="/authentic" className="ui-btn ui-btn--primary ui-btn--lg">Explore local tips</Link>
              <Link to="/trip-planner" className="ui-btn ui-btn--on-image ui-btn--lg">Start planning</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
