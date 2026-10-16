import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Map, Users } from 'lucide-react';
import { BrandMark } from '../components/brand/Logo';
import './NotFound.css';

const NotFound = () => {
  const { pathname } = useLocation();
  return (
    <section className="not-found" aria-labelledby="not-found-title">
      <div className="not-found__compass" aria-hidden="true">
        <BrandMark className="not-found__mark" />
        <span className="not-found__ring" />
      </div>
      <p className="eyebrow">Error 404</p>
      <h1 id="not-found-title">This road doesn't lead anywhere.</h1>
      <p className="not-found__lead">
        We couldn't find <code>{pathname}</code>. The page may have moved, or the link may be mistyped.
      </p>
      <div className="not-found__actions">
        <Link to="/" className="ui-btn ui-btn--primary ui-btn--lg"><ArrowLeft size={18} aria-hidden="true" /> Back to home</Link>
        <Link to="/search" className="ui-btn ui-btn--outline ui-btn--lg"><Map size={18} aria-hidden="true" /> Search the map</Link>
        <Link to="/guides" className="ui-btn ui-btn--ghost ui-btn--lg"><Users size={18} aria-hidden="true" /> Find a guide</Link>
      </div>
    </section>
  );
};

export default NotFound;
