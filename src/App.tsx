import { Suspense, lazy, useCallback } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { About } from './components/About/About';
import { Contact } from './components/Contact/Contact';
import { Footer } from './components/Footer/Footer';
import { Hero } from './components/Hero/Hero';
import { Navbar } from './components/Navbar/Navbar';
import { Work } from './components/Work/Work';
import { isSectionHash, navigateHomeToSection, useHashRoute } from './lib/router';

/* Heavy routes are code-split so the public homepage never pays for the
   Admin Dashboard (Supabase + storage) or the category video logic. */
const AdminWork = lazy(() =>
  import('./components/Admin/AdminWork').then((m) => ({ default: m.AdminWork })),
);
const WorkCategoryPage = lazy(() =>
  import('./pages/WorkCategoryPage').then((m) => ({ default: m.WorkCategoryPage })),
);

export default function App() {
  const route = useHashRoute();

  /* Section anchors scroll natively on home (unchanged behaviour). From a
     category page they return home first, then scroll to the section. */
  const handleSectionNavigate = useCallback(
    (href: string, event: ReactMouseEvent<HTMLAnchorElement>) => {
      if (!isSectionHash(href)) return;
      if (route.name === 'home') return;
      event.preventDefault();
      navigateHomeToSection(href.slice(1));
    },
    [route],
  );

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {route.name !== 'admin' && <Navbar onSectionNavigate={handleSectionNavigate} />}
      <Suspense fallback={null}>
      {route.name === 'admin' ? (
        <main id="main" tabIndex={-1}>
          <AdminWork />
        </main>
      ) : route.name === 'work-category' ? (
        <main id="main" tabIndex={-1}>
          <WorkCategoryPage key={route.slug} slug={route.slug} />
        </main>
      ) : (
        <main id="main" tabIndex={-1}>
          <Hero />
          <About />
          <Work />
          <Contact />
        </main>
      )}
      </Suspense>
      <Footer />
    </>
  );
}
