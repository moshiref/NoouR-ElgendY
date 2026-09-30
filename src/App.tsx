import { useCallback } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { About } from './components/About/About';
import { AdminWork } from './components/Admin/AdminWork';
import { Contact } from './components/Contact/Contact';
import { Footer } from './components/Footer/Footer';
import { Hero } from './components/Hero/Hero';
import { Navbar } from './components/Navbar/Navbar';
import { Work } from './components/Work/Work';
import { isSectionHash, navigateHomeToSection, useHashRoute } from './lib/router';
import { WorkCategoryPage } from './pages/WorkCategoryPage';

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
      <Navbar onSectionNavigate={handleSectionNavigate} />
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
      <Footer />
    </>
  );
}
