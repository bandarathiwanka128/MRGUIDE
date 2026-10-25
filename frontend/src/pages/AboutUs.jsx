import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Route, MapPin, ShieldCheck, Star, Globe2, ListOrdered, GraduationCap, Mail, Navigation, ArrowRight,
} from 'lucide-react';
import { BrandMark } from '../components/brand/Logo';
import useReveal from '../hooks/useReveal';
import './AboutUs.css';

const keyFeatures = [
  {
    icon: Route,
    title: 'Smart route planning',
    desc: 'Choose your stops and we work out an efficient order through all of them, saving time, fuel and effort on every journey.',
  },
  {
    icon: MapPin,
    title: 'Location search',
    desc: 'Find hotels, restaurants and attractions near you. Filter by type, rating and distance with live Google Maps results.',
  },
  {
    icon: ShieldCheck,
    title: 'Authentic local insights',
    desc: 'Go beyond the guidebook with tips and details shared by local experts, business owners and experienced travellers.',
  },
  {
    icon: Star,
    title: 'Community reviews',
    desc: 'Honest star ratings, stories and practical tips from travellers who have actually been to each place.',
  },
  {
    icon: Globe2,
    title: 'For travellers everywhere',
    desc: 'Plan from anywhere in the world, with international phone numbers and country-specific details built in.',
  },
  {
    icon: ListOrdered,
    title: 'Route optimisation',
    desc: 'Turn a scattered list of places into a sensible order, with total distance, travel time and turn-by-turn directions.',
  },
];

const team = [
  { initials: 'HT', name: 'Herath H.M.T.B', reg: 'EG/2022/5067', role: 'Backend & database design' },
  { initials: 'JT', name: 'Jayasekara T.H.D.P.U', reg: 'EG/2022/5098', role: 'Frontend & UI/UX design' },
  { initials: 'HA', name: 'Hapuarachchi H.A.C.R', reg: 'EG/2022/5058', role: 'Google Maps & API development' },
  { initials: 'HG', name: 'Hettiarachchi H.A.K.G', reg: 'EG/2022/5073', role: 'Algorithms & route optimisation' },
];

const stats = [
  { number: '6+', label: 'Travel tools' },
  { number: '100+', label: 'Places' },
  { number: '4', label: 'Engineers' },
];

const AboutUs = () => {
  const pageRef = useRef(null);
  useReveal(pageRef);

  return (
    <div className="about" ref={pageRef}>
      {/* ── HERO ── */}
      <header className="about-hero">
        <div className="container about-hero__inner">
          <p className="eyebrow">About us · Est. 2024</p>
          <h1>
            We&rsquo;re building the travel companion we wished we had in <em>Sri Lanka</em>.
          </h1>
          <p className="about-hero__lead">
            Mr. Guide brings route planning, local knowledge and trusted guides together, so exploring the island feels effortless.
          </p>
        </div>
      </header>

      {/* ── MISSION ── */}
      <section className="about-section" aria-labelledby="mission-title">
        <div className="container about-mission">
          <div className="about-mission__visual reveal">
            <div className="about-mission__emblem" aria-hidden="true">
              <BrandMark />
              <span className="about-mission__ring" />
            </div>
            <dl className="about-stats">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt>{s.label}</dt>
                  <dd>{s.number}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="about-mission__copy reveal" style={{ '--reveal-index': 1 }}>
            <p className="eyebrow">Our purpose</p>
            <h2 id="mission-title">Our mission</h2>
            <p>
              At Mr. Guide, we make travel planning simpler by combining intelligent route
              optimisation with authentic local knowledge. Our platform helps travellers discover
              hidden gems, plan efficient routes and make informed decisions based on information
              from local experts and fellow travellers.
            </p>
            <p>
              We are a team of four undergraduate engineers from the University of Ruhuna,
              passionate about making Sri Lanka&rsquo;s beautiful destinations more accessible
              to travellers from around the world.
            </p>
            <Link to="/search" className="about-link">Start exploring <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="about-section about-section--tint" aria-labelledby="features-title">
        <div className="container">
          <div className="about-head reveal">
            <p className="eyebrow">What we offer</p>
            <h2 id="features-title">Everything you need between the first idea and the final stop</h2>
          </div>
          <ul className="about-features">
            {keyFeatures.map(({ icon: Icon, title, desc }, i) => (
              <li key={title} className="about-feature reveal" style={{ '--reveal-index': i }}>
                <span className="about-feature__icon" aria-hidden="true"><Icon size={22} /></span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>



      {/* ── CONTACT ── */}
      <section className="about-section" aria-labelledby="contact-title">
        <div className="container">
          <div className="about-contact reveal">
            <div>
              <p className="eyebrow">Get in touch</p>
              <h2 id="contact-title">Questions or ideas? We&rsquo;d love to hear them.</h2>
            </div>
            <ul className="about-contact__items">
              <li>
                <a href="mailto:mrguide@eng.ruh.ac.lk"><Mail size={18} aria-hidden="true" /> mrguide@eng.ruh.ac.lk</a>
              </li>
              <li>
                <span><Navigation size={18} aria-hidden="true" /> Faculty of Engineering, University of Ruhuna, Hapugala, Galle, Sri Lanka</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;
