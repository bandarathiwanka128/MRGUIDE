import React from 'react';
import './Logo.css';

/* The Mr. Guide mark: a location pin holding a compass whose needle points
   north-east — "forward". Matches public/brand/mrguide-mark.svg. */
export const BrandMark = ({ className = '', title }) => (
  <svg
    className={`brand-mark ${className}`}
    viewBox="0 0 48 48"
    role={title ? 'img' : undefined}
    aria-hidden={title ? undefined : true}
    aria-label={title}
    focusable="false"
  >
    <path
      className="brand-mark__pin"
      d="M24 3C13.6 3 6.2 10.7 6.2 20.4 6.2 32.6 24 45 24 45s17.8-12.4 17.8-24.6C41.8 10.7 34.4 3 24 3Z"
    />
    <circle className="brand-mark__face" cx="24" cy="20" r="10.6" />
    <circle className="brand-mark__ring" cx="24" cy="20" r="8.4" />
    <g className="brand-mark__needle">
      <path className="brand-mark__north" d="M30.2 13.8 25.9 21.9 22.1 18.1Z" />
      <path className="brand-mark__south" d="M17.8 26.2 22.1 18.1 25.9 21.9Z" />
      <circle className="brand-mark__face" cx="24" cy="20" r="1.3" />
    </g>
  </svg>
);

const Logo = ({ compact = false, className = '' }) => (
  <span className={`brand-logo ${compact ? 'brand-logo--compact' : ''} ${className}`}>
    <BrandMark />
    <span className="brand-logo__word" aria-hidden={compact ? true : undefined}>
      <em>Mr.</em>
      <span>Guide</span>
    </span>
    {compact && <span className="sr-only">Mr. Guide</span>}
  </span>
);

export default Logo;
