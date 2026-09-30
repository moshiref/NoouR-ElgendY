import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { SECTION_IDS } from '../../data/site';
import type { WorkCategory } from '../../data/work';
import { cx } from '../../lib/cx';
import { workRepository } from '../../lib/workRepository';
import { useInView } from '../About/useInView';
import { WorkCategoryRow } from './WorkCategoryRow';
import styles from './Work.module.css';

const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

export function Work() {
  const { ref, inView } = useInView<HTMLElement>(0.15);
  const [categories, setCategories] = useState<WorkCategory[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cats = await workRepository.listVisibleCategories();
      if (cancelled) return;
      setCategories(cats);
      const entries = await Promise.all(
        cats.map(async (c) => {
          const items = await workRepository.listPublishedItems(c.id);
          return [c.id, items.length] as const;
        }),
      );
      if (cancelled) return;
      setCounts(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      ref={ref}
      id={SECTION_IDS.work}
      className={cx(styles.work, inView && styles.isVisible)}
      aria-labelledby="work-title"
    >
      <div className={styles.inner}>
        <p className={styles.reveal} style={delay(0)}>
          <span className={styles.kicker}>
            <span className={styles.kickerRule} aria-hidden="true" />
            Selected Work
          </span>
        </p>

        <h2 id="work-title" className={cx(styles.titleRow, styles.reveal)} style={delay(90)}>
          <span className={styles.title}>Work</span>
        </h2>

        <p className={cx(styles.lede, styles.reveal)} style={delay(180)}>
          Four disciplines — one visual language. Open a shelf to browse selected pieces.
        </p>

        <ul className={styles.rows} aria-label="Work categories">
          {categories?.map((category, index) => (
            <li key={category.id} className={styles.rowItem}>
              <WorkCategoryRow
                category={category}
                index={index}
                count={counts[category.id] ?? null}
                delay={240 + index * 110}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
