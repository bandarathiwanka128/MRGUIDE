import { useEffect } from 'react';

/* Adds `is-visible` to every `.reveal` element inside `rootRef` the first
   time it scrolls into view. Elements stay readable without JS or with
   reduced motion (see .reveal rules in styles/base.css). */
export default function useReveal(rootRef, deps = []) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const items = root.querySelectorAll('.reveal:not(.is-visible)');
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
