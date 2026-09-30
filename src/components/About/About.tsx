import { memo, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import about560 from '../../assets/about/about-560.webp';
import about747 from '../../assets/about/about-747.webp';
import { coatPalette as palette } from '../../assets/about/palette';
import { BRAND, SECTION_IDS } from '../../data/site';
import { cx } from '../../lib/cx';
import { useInView } from './useInView';
import styles from './About.module.css';

const IMAGE_WIDTH = 747;
const IMAGE_HEIGHT = 1024;

const SPECIALTIES = ['Fashion', 'Medical', 'Design', 'Reviews'] as const;

/** How long each specialty stays active before advancing (≈1s hold). */
const ACTIVE_HOLD_MS = 1100;

/** Accent measured from the coat in the portrait (scripts/optimize-about.mjs). */
const coatTheme = {
  '--coat': palette.accent,
  '--coat-hover': palette.accentHover,
  '--coat-rgb': palette.accentRgb,
} as CSSProperties;

const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/**
 * Specialties auto-highlight — isolated so the 1s tick re-renders only these
 * 4 words, never the portrait / text above. The timer runs only while the
 * row is actually on screen and the tab is visible, so it costs ~zero
 * offscreen. All visuals animate compositor-friendly props only
 * (opacity / translate / transform + color), no layout.
 */
const Specialties = memo(function Specialties() {
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  const reducedMotion = useReducedMotion();
  const [autoIndex, setAutoIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [onScreen, setOnScreen] = useState(false);
  const [tabVisible, setTabVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState === 'visible',
  );

  /* Continuous visibility: pause the loop whenever the row leaves the viewport. */
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setOnScreen(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(Boolean(entry?.isIntersecting)),
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  useEffect(() => {
    const onVisibility = () => setTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const running = inView && onScreen && tabVisible && !reducedMotion;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setAutoIndex((i) => (i + 1) % SPECIALTIES.length);
    }, ACTIVE_HOLD_MS);
    return () => window.clearInterval(id);
  }, [running]);

  const handleEnter = useCallback((index: number) => setHoveredIndex(index), []);
  /* Each row knows its own index, so leave resumes the loop from it directly. */
  const handleLeave = useCallback((index: number) => {
    setAutoIndex(index);
    setHoveredIndex(null);
  }, []);

  const displayedIndex = running || (inView && !reducedMotion) ? (hoveredIndex ?? autoIndex) : -1;

  return (
    <div
      ref={ref}
      className={cx(
        styles.specialties,
        inView && styles.isVisible,
        displayedIndex >= 0 && styles.hasActive,
      )}
    >
      <ul className={styles.specList} aria-label="Specialties">
        {SPECIALTIES.map((item, index) => (
          <li
            key={item}
            className={cx(styles.spec, index === displayedIndex && styles.isActive)}
            style={delay(120 + index * 120)}
            onMouseEnter={() => handleEnter(index)}
            onMouseLeave={() => handleLeave(index)}
          >
            <span className={styles.specWord}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
});

export function About() {
  const sectionRef = useRef<HTMLElement>(null);
  const figureRef = useRef<HTMLElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const composition = useInView<HTMLDivElement>(0.25);

  /* Book-opening entrance: plays once when ~25% of the section is visible.
     The overlay below is purely presentational (aria-hidden, pointer-events
     none) — all content reveals run exactly as before, underneath it.
     `bookArmed` pre-promotes the overlay's compositor layers shortly before
     entry (via a rootMargin observer) so the first frame never hitches, yet
     no GPU layers are held while the section is far away. Both observers are
     one-shot trigger callbacks — nothing is measured or computed during the
     animation itself, which runs entirely in CSS. */
  const [bookArmed, setBookArmed] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setBookArmed(true);
      setBookOpen(true);
      return;
    }
    const arm = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          arm.disconnect();
          setBookArmed(true);
        }
      },
      { threshold: 0, rootMargin: '60% 0px' },
    );
    let timer = 0;
    const open = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          open.disconnect();
          /* A short beat so the center seam reads before the pages swing. */
          timer = window.setTimeout(() => setBookOpen(true), 120);
        }
      },
      { threshold: 0.25 },
    );
    arm.observe(el);
    open.observe(el);
    return () => {
      arm.disconnect();
      open.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  /* Restrained scroll parallax: only the portrait drifts, by a few pixels. */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    let active = false;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      el.style.setProperty('--about-p', Math.min(Math.max(progress, 0), 1).toFixed(4));
    };
    const onScroll = () => {
      if (active && !frame) frame = requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(([entry]) => {
      active = Boolean(entry?.isIntersecting);
      if (active) onScroll();
    });

    observer.observe(el);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  /* Premium 3D tilt: eased pointer tilt on the portrait (max 2.5°).
     Desktop mice only; writes custom properties directly so React never
     re-renders. The rAF loop sleeps whenever the tilt settles. */
  useEffect(() => {
    const figure = figureRef.current;
    const stage = tiltRef.current;
    if (!figure || !stage) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const MAX_DEG = 2.5;
    const EASE = 0.08;
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let frame = 0;

    const tick = () => {
      x += (targetX - x) * EASE;
      y += (targetY - y) * EASE;
      stage.style.setProperty('--ry', `${x.toFixed(3)}deg`);
      stage.style.setProperty('--rx', `${y.toFixed(3)}deg`);
      const settled = Math.abs(targetX - x) < 0.01 && Math.abs(targetY - y) < 0.01;
      frame = settled ? 0 : requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

    const onPointerMove = (event: PointerEvent) => {
      const rect = figure.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      targetX = clamp1(((event.clientX - rect.left) / rect.width) * 2 - 1) * MAX_DEG;
      targetY = clamp1(-(((event.clientY - rect.top) / rect.height) * 2 - 1)) * MAX_DEG;
      wake();
    };
    const onPointerLeave = () => {
      targetX = 0;
      targetY = 0;
      wake();
    };

    figure.addEventListener('pointermove', onPointerMove, { passive: true });
    figure.addEventListener('pointerleave', onPointerLeave);
    return () => {
      cancelAnimationFrame(frame);
      figure.removeEventListener('pointermove', onPointerMove);
      figure.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id={SECTION_IDS.about}
      className={styles.about}
      style={coatTheme}
      aria-labelledby="about-title"
    >
      <div
        ref={composition.ref}
        className={cx(styles.composition, composition.inView && styles.isVisible)}
      >
        <figure ref={figureRef} className={styles.figure}>
          <span className={styles.backdrop} aria-hidden="true" />
          <div className={styles.portrait}>
            <div ref={tiltRef} className={styles.tilt}>
              <img
                className={styles.image}
                src={about747}
                srcSet={`${about560} 560w, ${about747} 747w`}
                sizes="(max-width: 720px) min(90vw, 24rem), min(40vw, 34rem)"
                width={IMAGE_WIDTH}
                height={IMAGE_HEIGHT}
                alt={`${BRAND} in a camel wrap coat, cream knit scarf and glasses, one hand raised to the cheek`}
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            </div>
          </div>
        </figure>

        <div className={styles.content}>
          <h2 id="about-title" className={cx(styles.identity, styles.reveal)} style={delay(280)}>
            <span className={styles.identityRule} aria-hidden="true" />
            <span>
              {BRAND} &mdash; <em className={styles.serif}>visual artist</em>
            </span>
          </h2>

          <p className={styles.tenure}>
            <span className={cx(styles.number, styles.reveal)} style={delay(420)}>
              6
            </span>{' '}
            <span className={cx(styles.unit, styles.reveal)} style={delay(560)}>
              Years
            </span>
          </p>

          <p className={styles.statement}>
            <span className={styles.mask}>
              <span className={styles.maskInner} style={delay(700)}>
                Of turning ideas
              </span>
            </span>{' '}
            <span className={styles.mask}>
              <span className={styles.maskInner} style={delay(790)}>
                into visual <span className={styles.statementAccent}>experiences.</span>
              </span>
            </span>
          </p>

          <p className={cx(styles.copy, styles.reveal)} style={delay(960)}>
            For 6 years, I&rsquo;ve been creating visual experiences that combine creativity,
            technology and storytelling &mdash; from AI-powered videos and UGC to fashion, medical
            content, design and product reviews.
          </p>
        </div>
      </div>

      <Specialties />

      {/* Luxury book-opening entrance: two dark pages hinged at the center
          spine swing outward to reveal the section. Overlay only. */}
      <div
        className={cx(styles.book, bookArmed && styles.bookArmed, bookOpen && styles.bookOpen)}
        aria-hidden="true"
      >
        <div className={styles.bookShade} />
        <div className={cx(styles.page, styles.pageLeft)} />
        <div className={cx(styles.page, styles.pageRight)} />
        <span className={styles.spine} />
      </div>
    </section>
  );
}
