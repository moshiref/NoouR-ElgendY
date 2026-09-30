import { useEffect, type RefObject } from 'react';

const EASE = 0.075;
const EPSILON = 0.0005;

/**
 * Drives depth effects through CSS custom properties on `ref`:
 *   --px / --py   eased pointer position, -1 … 1 relative to the viewport centre
 *   --scroll      0 … 1 progress of the element scrolling out of view
 *
 * Only custom properties are written; every visual response is a CSS transform,
 * so nothing here triggers layout. The rAF loop sleeps whenever values settle.
 */
export function usePointerParallax(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let frame = 0;

    const tick = () => {
      x += (targetX - x) * EASE;
      y += (targetY - y) * EASE;
      el.style.setProperty('--px', x.toFixed(4));
      el.style.setProperty('--py', y.toFixed(4));

      const settled = Math.abs(targetX - x) < EPSILON && Math.abs(targetY - y) < EPSILON;
      frame = settled ? 0 : requestAnimationFrame(tick);
    };

    const wake = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (reducedMotion.matches || !finePointer.matches || event.pointerType !== 'mouse') return;
      if (window.scrollY > el.offsetHeight) return;
      targetX = (event.clientX / window.innerWidth) * 2 - 1;
      targetY = (event.clientY / window.innerHeight) * 2 - 1;
      wake();
    };

    const onPointerLeave = () => {
      targetX = 0;
      targetY = 0;
      wake();
    };

    const onScroll = () => {
      if (reducedMotion.matches) return;
      const progress = Math.min(Math.max(window.scrollY / el.offsetHeight, 0), 1);
      el.style.setProperty('--scroll', progress.toFixed(4));
    };

    onScroll();
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('scroll', onScroll);
    };
  }, [ref]);
}
