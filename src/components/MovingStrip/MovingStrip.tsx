import type { CSSProperties } from 'react';
import { cx } from '../../lib/cx';
import styles from './MovingStrip.module.css';

type MovingStripProps = {
  items: readonly string[];
  /** Seconds for one full loop. */
  duration?: number;
  /** How many times the item set repeats within one loop segment. */
  repeat?: number;
  className?: string;
};

/**
 * A 35mm-style film strip travelling through 3D space.
 *
 * The track holds two identical segments and translates by exactly -50%,
 * so the loop is seamless. Frame widths are a multiple of the sprocket
 * pitch, keeping the perforations continuous across every seam.
 */
export function MovingStrip({ items, duration = 46, repeat = 2, className }: MovingStripProps) {
  const segment = Array.from({ length: repeat }, () => items).flat();

  return (
    <div className={cx(styles.root, className)}>
      <ul className="visually-hidden" aria-label="Disciplines">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <div className={styles.rig} aria-hidden="true">
        <div className={styles.film}>
          <div className={styles.track} style={{ '--duration': `${duration}s` } as CSSProperties}>
            {[0, 1].map((copy) => (
              <div className={styles.segment} key={copy}>
                {segment.map((item, index) => (
                  <div className={styles.frame} key={`${copy}-${index}`}>
                    <span className={styles.index}>
                      {String((index % items.length) + 1).padStart(2, '0')}
                    </span>
                    <span className={styles.label}>{item}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
