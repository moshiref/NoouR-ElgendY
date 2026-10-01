import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';

/**
 * Pathname bridge for deep links.
 *
 * This project routes by hash (`#/admin/work`, `#/work/:slug`, plus plain
 * section anchors `#about` / `#work` / `#contact`), so a plain pathname
 * visit (e.g. `/admin/work` or `/work/ai-video`) would boot with an empty
 * hash and land on the homepage. Rewrite known pathnames to their hash
 * equivalent BEFORE React mounts, so every URL works on load and refresh
 * (on any host that serves index.html for that path — vercel.json does).
 * Unknown paths are left alone (home boots, no redirect loop).
 */
if (typeof window !== 'undefined' && !window.location.hash.startsWith('#/')) {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const search = window.location.search || '';
  const sectionMatch = /^\/(about|work|contact)$/i.exec(path);
  const categoryMatch = /^\/work\/([a-z0-9-]+)$/i.exec(path);
  const adminMatch = /^\/(admin(?:\/work)?)$/i.exec(path);
  const target = adminMatch
    ? `#/admin/work${search}`
    : categoryMatch
      ? `#/work/${categoryMatch[1].toLowerCase()}${search}`
      : sectionMatch
        ? `#${sectionMatch[1].toLowerCase()}`
        : null;
  if (target) window.location.replace(`/${target}`);
}

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
