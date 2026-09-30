import { useCallback, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { BRAND, CTA_HREF, NAV_LINKS, SECTION_IDS } from '../../data/site';
import { useScrolled } from '../../hooks/useScrolled';
import { ArrowButton } from '../ui/ArrowButton/ArrowButton';
import { MobileMenu } from './MobileMenu';
import styles from './Navbar.module.css';

const MENU_ID = 'mobile-menu';

export type SectionNavigateHandler = (
  href: string,
  event: ReactMouseEvent<HTMLAnchorElement>,
) => void;

type NavbarProps = {
  /** Routing hook only: intercepts section anchors when off-home. Visuals
      and on-home behaviour are identical with or without it. */
  onSectionNavigate?: SectionNavigateHandler;
};

export function Navbar({ onSectionNavigate }: NavbarProps) {
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <>
      <header
        className={styles.header}
        data-scrolled={scrolled || undefined}
        data-menu-open={menuOpen || undefined}
      >
        <nav className={styles.bar} aria-label="Primary">
          <a
            href={`#${SECTION_IDS.home}`}
            className={styles.brand}
            onClick={(event) => {
              closeMenu();
              onSectionNavigate?.(`#${SECTION_IDS.home}`, event);
            }}
          >
            {BRAND}
          </a>

          <ul className={styles.links}>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={styles.link}
                  onClick={(event) => onSectionNavigate?.(link.href, event)}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className={styles.actions}>
            <ArrowButton
              href={CTA_HREF}
              variant="outline"
              size="sm"
              hoverLocked
              className={styles.cta}
              onClick={(event) => onSectionNavigate?.(CTA_HREF, event)}
            >
              Let&rsquo;s Talk
            </ArrowButton>

            <button
              ref={toggleRef}
              type="button"
              className={styles.menuToggle}
              aria-expanded={menuOpen}
              aria-controls={MENU_ID}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className={styles.menuLabel}>{menuOpen ? 'Close' : 'Menu'}</span>
              <span className={styles.menuIcon} aria-hidden="true">
                <span />
                <span />
              </span>
            </button>
          </div>
        </nav>
      </header>

      <MobileMenu
        id={MENU_ID}
        open={menuOpen}
        onClose={closeMenu}
        returnFocusRef={toggleRef}
        onSectionNavigate={onSectionNavigate}
      />
    </>
  );
}
