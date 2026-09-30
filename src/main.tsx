import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';

/**
 * Pathname bridge for the Admin Dashboard.
 *
 * This project routes by hash (`#/admin/work`, `#/work/:slug`), so a plain
 * pathname visit to `/admin/work` would boot with an empty hash and land on
 * the homepage. Rewrite it to the real hash route BEFORE React mounts, so
 * the exact URL works on load and on refresh (on any host that serves
 * index.html for that path, which Vite dev/preview do by default).
 */
if (
  typeof window !== 'undefined' &&
  window.location.pathname.replace(/\/+$/, '') === '/admin/work' &&
  !window.location.hash.startsWith('#/admin')
) {
  window.location.replace('/#/admin/work');
}

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
