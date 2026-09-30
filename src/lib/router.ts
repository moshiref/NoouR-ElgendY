import { useEffect, useState } from 'react';

/**
 * Minimal hash router — no dependency, works on any static host.
 *
 * Routes live under `#/` so the existing plain section anchors (`#about`,
 * `#work`, `#contact`) keep their native smooth-scroll behaviour untouched:
 *
 *   `#/` or `` (empty)  → home (Hero + About + Work)
 *   `#/work/:slug`      → dedicated category page (AI Video, Design, …)
 *   `#/admin/work`      → Work Admin Dashboard (device uploads, Supabase)
 *
 * If the site ever moves to a host with SPA fallbacks, swap `parseHashRoute`
 * / `goRoute` for BrowserRouter equivalents — all links go through
 * `categoryHref()` / `homeHref()`, so call sites stay the same.
 */

export type Route = { name: 'home' } | { name: 'work-category'; slug: string } | { name: 'admin' };

const WORK_PREFIX = '#/work/';
const ADMIN_PREFIX = '#/admin/';

export function adminHref(): string {
  return '#/admin/work';
}

export function categoryHref(slug: string): string {
  return `#/work/${slug}`;
}

export function homeHref(): string {
  return '#/';
}

export function parseHashRoute(hash: string): Route {
  if (hash === '#/admin/work' || hash.startsWith(ADMIN_PREFIX)) {
    return { name: 'admin' };
  }
  if (hash.startsWith(WORK_PREFIX)) {
    const slug = hash.slice(WORK_PREFIX.length).split(/[?#]/)[0]?.trim().toLowerCase();
    if (slug) return { name: 'work-category', slug };
  }
  return { name: 'home' };
}

function readRoute(): Route {
  return typeof window === 'undefined' ? { name: 'home' } : parseHashRoute(window.location.hash);
}

export function isSectionHash(href: string): boolean {
  return href.startsWith('#') && !href.startsWith('#/');
}

/** Current route, synced on every hash change. */
export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(readRoute);

  useEffect(() => {
    const onChange = () => setRoute(readRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  /* Category + admin pages always start at the top. Plain anchors on home
     are left alone so native smooth scrolling keeps working. */
  useEffect(() => {
    if (route.name !== 'home') window.scrollTo(0, 0);
  }, [route]);

  return route;
}

/**
 * From a category page, return home and then scroll to a section
 * (Navbar About / Work / Contact links). Polls a few frames for the home
 * content to mount; silently gives up if the target doesn't exist
 * (e.g. `#contact` before that section ships — same no-op as today).
 */
export function navigateHomeToSection(sectionId: string): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (window.location.hash !== '#/') window.location.hash = '#/';

  let attempts = 0;
  const tryScroll = () => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', `#${sectionId}`);
    } else if (++attempts < 24) {
      requestAnimationFrame(tryScroll);
    }
  };
  requestAnimationFrame(tryScroll);
}
