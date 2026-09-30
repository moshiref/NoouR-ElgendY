import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import { CTA_HREF, HERO_DISCIPLINES, NAV_LINKS } from '../../data/site';
import { ArrowButton } from '../ui/ArrowButton/ArrowButton';
import type { SectionNavigateHandler } from './Navbar';
import styles from './MobileMenu.module.css';

type MobileMenuProps = {
  id: string;
  open: boolean;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  onSectionNavigate?: SectionNavigateHandler;
};

const DESKTOP_QUERY = '(min-width: 821px)';

export function MobileMenu({ id, open, onClose, returnFocusRef, onSectionNavigate }: MobileMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;

    const main = document.getElementById('main');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (main) main.inert = true;

    const focusFrame = requestAnimationFrame(() => firstLinkRef.current?.focus({ preventScroll: true }));

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const onBreakpoint = (event: MediaQueryListEvent) => {
      if (event.matches) onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    desktop.addEventListener('change', onBreakpoint);

    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      if (main) main.inert = false;
      window.removeEventListener('keydown', onKeyDown);
      desktop.removeEventListener('change', onBreakpoint);

      const focusWasInside = panelRef.current?.contains(document.activeElement);
      if (focusWasInside || document.activeElement === document.body) {
        returnFocusRef.current?.focus({ preventScroll: true });
      }
    };
  }, [open, onClose, returnFocusRef]);

  return (
    <div
      ref={panelRef}
      id={id}
      className={styles.overlay}
      data-open={open || undefined}
      inert={!open}
    >
      <nav className={styles.inner} aria-label="Mobile">
        <p className={styles.kicker} style={{ '--i': 0 } as CSSProperties}>
          Index
        </p>

        <ul className={styles.list}>
          {NAV_LINKS.map((link, index) => (
            <li key={link.href} className={styles.item} style={{ '--i': index + 1 } as CSSProperties}>
              <a
                ref={index === 0 ? firstLinkRef : undefined}
                href={link.href}
                className={styles.link}
                onClick={(event) => {
                  onClose();
                  onSectionNavigate?.(link.href, event);
                }}
              >
                <span className={styles.index} aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className={styles.label}>{link.label}</span>
              </a>
            </li>
          ))}
        </ul>

        <div className={styles.footer} style={{ '--i': NAV_LINKS.length + 1 } as CSSProperties}>
          <ArrowButton
            href={CTA_HREF}
            onClick={(event) => {
              onClose();
              onSectionNavigate?.(CTA_HREF, event);
            }}
            hideIcon
            className={styles.cta}
          >
            Let&rsquo;s Talk
          </ArrowButton>
          <p className={styles.note}>{HERO_DISCIPLINES.join(' · ')}</p>
        </div>
      </nav>
    </div>
  );
}
