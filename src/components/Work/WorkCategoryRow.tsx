import type { CSSProperties } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { WorkCategory } from '../../data/work';
import { categoryHref } from '../../lib/router';
import { cx } from '../../lib/cx';
import styles from './Work.module.css';

type WorkCategoryRowProps = {
  category: WorkCategory;
  index: number;
  /** Published-piece count; null while loading. */
  count: number | null;
  delay: number;
};

const rowStyle = (ms: number, accent: string | null) =>
  ({ '--d': `${ms}ms`, '--accent': accent ?? undefined }) as CSSProperties;

export function WorkCategoryRow({ category, index, count, delay: delayMs }: WorkCategoryRowProps) {
  const countLabel =
    count === null
      ? '…'
      : count === 0
        ? 'Curating soon'
        : `${String(count).padStart(2, '0')} ${count === 1 ? 'Piece' : 'Pieces'}`;

  return (
    <a
      href={categoryHref(category.slug)}
      className={cx(styles.row, styles.reveal)}
      style={rowStyle(delayMs, category.accent)}
      aria-label={`${category.title} — ${category.shortDescription}`}
    >
      <span className={styles.index} aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className={styles.body}>
        <span className={styles.rowTitle}>{category.title}</span>
        <span className={styles.rowDesc}>{category.shortDescription}</span>
      </span>
      <span className={styles.meta}>{countLabel}</span>
      <span className={styles.arrow} aria-hidden="true">
        <ArrowUpRight strokeWidth={1.75} />
      </span>
    </a>
  );
}
