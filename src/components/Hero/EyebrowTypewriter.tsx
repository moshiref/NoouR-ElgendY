import { useEffect, useRef, useState } from 'react';
import { HERO_DISCIPLINES } from '../../data/site';
import styles from './Hero.module.css';

/** Exact eyebrow copy — middle dots have no surrounding spaces. */
const FULL_TEXT = HERO_DISCIPLINES.join('·');

const TYPE_BASE_MS = 60;
const TYPE_JITTER_MS = 20; // 60–80ms per character
const DELETE_BASE_MS = 35;
const DELETE_JITTER_MS = 15; // 35–50ms per character
const HOLD_FULL_MS = 1200;
const HOLD_EMPTY_MS = 300;
const START_DELAY_MS = 650;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Premium typewriter loop for the Hero eyebrow. Typing state lives here so
 * the rest of the Hero never re-renders. A hidden sizer reserves the full
 * text width, so typing/deleting never shifts the layout.
 */
export function EyebrowTypewriter() {
  const [count, setCount] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION_QUERY).matches,
  );
  const startedRef = useRef(false);

  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setCount(FULL_TEXT.length);
      setDeleting(false);
      return;
    }

    let timer: ReturnType<typeof setTimeout>;

    if (!deleting && count >= FULL_TEXT.length) {
      timer = setTimeout(() => setDeleting(true), HOLD_FULL_MS);
    } else if (deleting && count <= 0) {
      timer = setTimeout(() => setDeleting(false), HOLD_EMPTY_MS);
    } else if (deleting) {
      timer = setTimeout(
        () => setCount((value) => Math.max(0, value - 1)),
        DELETE_BASE_MS + Math.random() * DELETE_JITTER_MS,
      );
    } else {
      const delayMs =
        !startedRef.current && count === 0
          ? START_DELAY_MS
          : TYPE_BASE_MS + Math.random() * TYPE_JITTER_MS;
      timer = setTimeout(() => {
        startedRef.current = true;
        setCount((value) => Math.min(FULL_TEXT.length, value + 1));
      }, delayMs);
    }

    return () => clearTimeout(timer);
  }, [count, deleting, reducedMotion]);

  if (reducedMotion) {
    return (
      <span className={styles.typewriter}>
        <span aria-hidden="true">{FULL_TEXT}</span>
      </span>
    );
  }

  return (
    <span className={styles.typewriter}>
      {/* Announced once to screen readers; the animated copy is decorative. */}
      <span className="visually-hidden">{FULL_TEXT}</span>
      {/* Invisible full-text copy that reserves the width and prevents layout shift. */}
      <span className={styles.sizer} aria-hidden="true">
        {FULL_TEXT}
      </span>
      <span className={styles.typed} aria-hidden="true">
        {FULL_TEXT.slice(0, count)}
        <span className={styles.caret} aria-hidden="true" />
      </span>
    </span>
  );
}
