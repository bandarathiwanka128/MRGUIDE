import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Sparkles, X, Send, MapPin, Landmark, LifeBuoy, AlertTriangle, Database, RotateCcw, ArrowUpRight,
} from 'lucide-react';
import { API_BASE_URL } from '../../config';
import './AIAssistant.css';

/* Mr. Guide assistant.
   Real capabilities only — each mode maps to an existing backend endpoint:
     places  → POST /ai/travel-suggest  (database matches + Gemini suggestions)
     about   → POST /ai/place-info      (Gemini description of one place)
     help    → static help written for this app (clearly labelled, not AI)
   When the backend returns `fallback: true` (Gemini unavailable) the UI says so. */

const MODES = [
  { id: 'places', label: 'Find places', icon: MapPin, placeholder: 'e.g. Quiet beaches near Galle for two days' },
  { id: 'about', label: 'About a place', icon: Landmark, placeholder: 'Type a place name, e.g. Ella' },
  { id: 'help', label: 'Using the app', icon: LifeBuoy, placeholder: 'e.g. How do I book a guide?' },
];

const HELP_ARTICLES = [
  {
    q: 'How do I book a local guide?',
    keys: ['book', 'guide', 'hire', 'booking'],
    a: 'Open Find a guide, choose a guide on the list or map, then press Book. You confirm the pickup point and see the fare estimate before the request is sent. Once the guide accepts and starts the trip, you can follow it live.',
    link: { to: '/guides', label: 'Find a guide' },
  },
  {
    q: 'How do I plan a multi-day trip?',
    keys: ['plan', 'itinerary', 'planner', 'days', 'multi-day', 'schedule'],
    a: 'Trip planner lets you add destinations, pick a travel mode and dates, and save the trip. When you are logged in, the AI Travel Plan panel generates a day-by-day plan for the destinations you added.',
    link: { to: '/trip-planner', label: 'Open Trip planner' },
  },
  {
    q: 'How do I find the shortest route between stops?',
    keys: ['route', 'shortest', 'stops', 'order', 'directions', 'fastest'],
    a: 'Shortest route takes your start point and a list of stops, then asks Google Maps for the best order. You get total distance, time and turn-by-turn directions.',
    link: { to: '/shortest-path', label: 'Open Shortest route' },
  },
  {
    q: 'What is the Authentic section?',
    keys: ['authentic', 'local', 'tips', 'business', 'community'],
    a: 'Authentic Sri Lanka collects tips, prices and small local businesses added by registered Authentic Users who know the area. Search a place to read what locals have added.',
    link: { to: '/authentic', label: 'Explore Authentic' },
  },
  {
    q: 'How does payment work after a trip?',
    keys: ['pay', 'payment', 'card', 'cash', 'fare', 'price'],
    a: 'When your guide ends the trip, the final fare is calculated from distance and any waiting time. You can pay by card on the payment page (processed by Stripe) or scan the guide’s QR code.',
    link: null,
  },
  {
    q: 'How do I become a guide?',
    keys: ['become', 'register', 'join', 'work', 'earn'],
    a: 'Log in, then open Become a guide. Fill in your details, distance pricing and payout bank details. Your profile is reviewed before it appears in Find a guide.',
    link: { to: '/guides/register', label: 'Become a guide' },
  },
];

const CONTEXT_PROMPTS = {
  '/': { mode: 'places', prompts: ['Best beaches to visit in August', 'Hill country for a 3-day trip', 'Cultural sites for families'] },
  '/search': { mode: 'about', prompts: ['Sigiriya', 'Nine Arches Bridge', 'Galle Fort'] },
  '/shortest-path': { mode: 'help', prompts: ['How do I find the shortest route between stops?'] },
  '/trip-planner': { mode: 'places', prompts: ['Wildlife parks for a 2-day trip', 'Where to see tea estates'] },
  '/authentic': { mode: 'help', prompts: ['What is the Authentic section?'] },
  '/guides': { mode: 'help', prompts: ['How do I book a local guide?', 'How does payment work after a trip?'] },
  '/about': { mode: 'help', prompts: ['How do I become a guide?'] },
};

const DEFAULT_PROMPTS = {
  places: CONTEXT_PROMPTS['/'].prompts,
  about: CONTEXT_PROMPTS['/search'].prompts,
  help: [],
};

const contextFor = (path) => {
  const key = Object.keys(CONTEXT_PROMPTS)
    .filter((k) => k !== '/')
    .find((k) => path === k || path.startsWith(`${k}/`));
  return CONTEXT_PROMPTS[key || '/'];
};

const matchHelp = (text) => {
  const t = text.toLowerCase();
  let best = null;
  let bestScore = 0;
  HELP_ARTICLES.forEach((art) => {
    const score = art.keys.reduce((s, k) => (t.includes(k) ? s + 1 : s), 0);
    if (score > bestScore) { best = art; bestScore = score; }
  });
  return best;
};

const cleanLine = (line) => line.replace(/^[*#\-\s]+/, '').replace(/\*\*/g, '');

let idSeq = 0;
const nextId = () => { idSeq += 1; return `m${idSeq}`; };

const AIAssistant = ({ open, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const ctx = useMemo(() => contextFor(location.pathname), [location.pathname]);
  const [mode, setMode] = useState(ctx.mode);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState(false);
  const inputRef = useRef(null);
  const logRef = useRef(null);

  // Follow the page's best default mode until the user starts a conversation
  useEffect(() => { if (!messages.length) setMode(ctx.mode); }, [ctx.mode, messages.length]);

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); document.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, pending]);

  const push = (msg) => setMessages((list) => [...list, { id: nextId(), ...msg }]);

  const ask = async (raw, askMode = mode) => {
    const text = raw.trim();
    if (!text || pending) return;
    setMode(askMode);
    setInput('');
    push({ role: 'user', text });

    if (askMode === 'help') {
      const art = matchHelp(text);
      push(art
        ? { role: 'help', title: art.q, text: art.a, link: art.link }
        : { role: 'help', title: 'No matching help topic', text: 'Try asking about booking a guide, planning a trip, routes, the Authentic section, payments or becoming a guide.' });
      return;
    }

    if (askMode === 'places' && text.length < 5) {
      push({ role: 'error', text: 'Please describe what you are looking for in a little more detail.' });
      return;
    }

    setPending(true);
    try {
      if (askMode === 'places') {
        const { data } = await axios.post(`${API_BASE_URL}/ai/travel-suggest`, { question: text });
        push({ role: 'places', items: Array.isArray(data.suggestions) ? data.suggestions : [], fallback: Boolean(data.fallback) });
      } else {
        const { data } = await axios.post(`${API_BASE_URL}/ai/place-info`, { name: text });
        const info = String(data.info || '');
        // Offline fallback text is only shown when it is actually about the place asked for
        const firstWord = text.toLowerCase().split(/\s+/)[0];
        const relevant = !data.fallback || info.toLowerCase().startsWith(firstWord);
        push({ role: 'about', place: text, text: relevant ? info : '', fallback: Boolean(data.fallback) });
      }
    } catch (err) {
      const offline = err?.response?.data?.offline || !navigator.onLine;
      push({
        role: 'error',
        text: offline
          ? 'You appear to be offline. Reconnect and try again.'
          : 'I couldn’t reach the Mr. Guide server. Please try again in a moment.',
        retry: { text, mode: askMode },
      });
    } finally {
      setPending(false);
    }
  };

  const onSubmit = (e) => { e.preventDefault(); ask(input); };
  const current = MODES.find((x) => x.id === mode);
  const prompts = mode === ctx.mode ? ctx.prompts : DEFAULT_PROMPTS[mode];
  const helpExtras = mode === 'help' ? HELP_ARTICLES.map((a) => a.q).filter((q) => !prompts.includes(q)).slice(0, 4 - prompts.length) : [];

  return (
    <aside
      className={`assistant-panel${open ? ' is-open' : ''}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="assistant-title"
      inert={open ? undefined : ''}
    >
      <header className="assistant-panel__head">
        <span className="assistant-panel__badge" aria-hidden="true"><Sparkles size={18} /></span>
        <div>
          <h2 id="assistant-title">Ask Mr. Guide</h2>
          <p>Powered by Google Gemini and local community data</p>
        </div>
        <button type="button" className="ui-icon-btn" onClick={onClose} aria-label="Close assistant">
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <div className="assistant-panel__modes ui-segmented" role="group" aria-label="What do you need?">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" aria-pressed={mode === id} onClick={() => { setMode(id); inputRef.current?.focus(); }}>
            <Icon size={15} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      <div className="assistant-panel__log" ref={logRef} aria-live="polite" aria-busy={pending}>
        {messages.length === 0 && (
          <div className="assistant-intro">
            <p className="assistant-intro__lead">
              {mode === 'places' && 'Describe the trip you have in mind. I’ll suggest places, starting with ones our local community has added.'}
              {mode === 'about' && 'Name any place in Sri Lanka for a short briefing: history, best time to visit, fees and tips.'}
              {mode === 'help' && 'Questions about using Mr. Guide? Pick a topic or type your own.'}
            </p>
            <p className="assistant-intro__label">Try asking</p>
            <div className="assistant-intro__prompts">
              {[...prompts, ...helpExtras].map((p) => (
                <button key={p} type="button" className="ui-chip" onClick={() => ask(p, mode)}>{p}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.role === 'user') {
            return <div key={msg.id} className="assistant-msg assistant-msg--user"><p>{msg.text}</p></div>;
          }
          if (msg.role === 'error') {
            return (
              <div key={msg.id} className="assistant-msg assistant-msg--error" role="alert">
                <AlertTriangle size={16} aria-hidden="true" />
                <div>
                  <p>{msg.text}</p>
                  {msg.retry && (
                    <button type="button" className="assistant-link" onClick={() => ask(msg.retry.text, msg.retry.mode)}>
                      <RotateCcw size={14} aria-hidden="true" /> Try again
                    </button>
                  )}
                </div>
              </div>
            );
          }
          if (msg.role === 'help') {
            return (
              <div key={msg.id} className="assistant-msg assistant-msg--bot">
                <span className="ui-badge">Help topic</span>
                <h3>{msg.title}</h3>
                <p>{msg.text}</p>
                {msg.link && <Link to={msg.link.to} className="assistant-link" onClick={onClose}>{msg.link.label} <ArrowUpRight size={14} aria-hidden="true" /></Link>}
              </div>
            );
          }
          if (msg.role === 'about') {
            return (
              <div key={msg.id} className="assistant-msg assistant-msg--bot">
                {msg.fallback ? <FallbackNote /> : <span className="ui-badge ui-badge--gold"><Sparkles size={11} aria-hidden="true" /> AI answer</span>}
                {msg.text ? (
                  <>
                    <h3>{msg.place}</h3>
                    {msg.text.split(/\n+/).filter((l) => l.trim()).map((line, i) => <p key={i}>{cleanLine(line)}</p>)}
                  </>
                ) : (
                  <p>I can&rsquo;t describe <strong>{msg.place}</strong> right now because the AI service is unavailable.</p>
                )}
                <button type="button" className="assistant-link" onClick={() => { navigate(`/search?q=${encodeURIComponent(`${msg.place} Sri Lanka`)}`); onClose(); }}>
                  Show {msg.place} on the map <ArrowUpRight size={14} aria-hidden="true" />
                </button>
              </div>
            );
          }
          return (
            <div key={msg.id} className="assistant-msg assistant-msg--bot">
              {msg.fallback
                ? <FallbackNote text="These are popular picks, not tailored to your question." />
                : <span className="ui-badge ui-badge--gold"><Sparkles size={11} aria-hidden="true" /> Suggestions</span>}
              {msg.items.length === 0 && <p>No places matched. Try describing the area, activity or season.</p>}
              <ul className="assistant-places">
                {msg.items.map((p, i) => (
                  <li key={`${p.name}-${i}`} className="assistant-place">
                    <div className="assistant-place__top">
                      <strong>{p.name}</strong>
                      {p.source === 'database'
                        ? <span className="ui-badge ui-badge--blue"><Database size={11} aria-hidden="true" /> Local data</span>
                        : <span className="ui-badge">{msg.fallback ? 'Popular' : 'AI'}</span>}
                    </div>
                    {p.reason && <p>{p.reason}</p>}
                    <div className="assistant-place__meta">
                      {p.category && <span>{p.category}</span>}
                      {p.best_months && <span>Best: {p.best_months}</span>}
                    </div>
                    <button
                      type="button"
                      className="assistant-link"
                      onClick={() => { navigate(`/search?q=${encodeURIComponent(p.search_query || `${p.name} Sri Lanka`)}`); onClose(); }}
                    >
                      Show on map <ArrowUpRight size={14} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        {pending && (
          <div className="assistant-msg assistant-msg--bot assistant-msg--pending">
            <span className="assistant-dots" aria-hidden="true"><i /><i /><i /></span>
            <span>{mode === 'places' ? 'Searching local data and asking Gemini…' : 'Asking Gemini…'}</span>
          </div>
        )}
      </div>

      <form className="assistant-panel__form" onSubmit={onSubmit}>
        <label htmlFor="assistant-input" className="sr-only">{current.label}</label>
        <input
          id="assistant-input"
          ref={inputRef}
          className="ui-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={current.placeholder}
          autoComplete="off"
          maxLength={300}
        />
        <button type="submit" className="ui-btn ui-btn--primary assistant-panel__send" disabled={!input.trim() || pending} aria-label="Send">
          {pending ? <span className="ui-spinner" aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
        </button>
      </form>
      <p className="assistant-panel__note">AI answers can be wrong. Check opening times and prices before you travel.</p>
    </aside>
  );
};

const FallbackNote = ({ text }) => (
  <p className="assistant-fallback" role="note">
    <AlertTriangle size={14} aria-hidden="true" />
    <span><strong>AI is unavailable right now.</strong> {text || 'This is stored offline information.'}</span>
  </p>
);

export const AssistantLauncher = React.forwardRef(({ onOpen, open }, ref) => (
  <button
    ref={ref}
    type="button"
    className={`assistant-launcher${open ? ' is-active' : ''}`}
    onClick={onOpen}
    aria-label="Ask Mr. Guide, the travel assistant"
    aria-expanded={open}
    title="Ask Mr. Guide"
  >
    <Sparkles size={17} aria-hidden="true" className="assistant-launcher__icon" />
    <span className="assistant-launcher__label" aria-hidden="true">Ask AI</span>
  </button>
));

export default AIAssistant;
