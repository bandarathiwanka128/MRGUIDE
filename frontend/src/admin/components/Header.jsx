import React from 'react';

export default function Header({ title, subtitle, actions }) {
  return (
    <header className="header">
      <div>
        <h1 className="header-title">{title}</h1>
        {subtitle && <div className="header-sub">{subtitle}</div>}
      </div>
      <div className="header-spacer" />
      {actions}

    </header>
  );
}
