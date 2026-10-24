import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, pages, total, limit, onPage }) {
  if (pages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="pagination">
      <span className="pagination-info">Showing {from}–{to} of {total}</span>
      <button className="page-btn" onClick={() => onPage(page - 1)} disabled={page === 1}>
        <ChevronLeft size={14} />
      </button>
      {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
        const p = i + 1;
        return (
          <button key={p} className={`page-btn${page === p ? ' active' : ''}`} onClick={() => onPage(p)}>
            {p}
          </button>
        );
      })}
      {pages > 7 && page < pages && <span style={{ color: 'var(--text-3)', fontSize: 12 }}>…</span>}
      <button className="page-btn" onClick={() => onPage(page + 1)} disabled={page === pages}>
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
