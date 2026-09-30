import { useEffect } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { SECTION_IDS } from '../data/site';
import { categoryHref, navigateHomeToSection } from '../lib/router';
import { useWorkCategory } from '../lib/workRepository';
import { ArrowButton } from '../components/ui/ArrowButton/ArrowButton';
import { WorkMedia } from '../components/Work/WorkMedia';
import { cx } from '../lib/cx';
import styles from './WorkCategoryPage.module.css';

const BASE_TITLE = 'NoouR ElgendY';

function backToWork(event: ReactMouseEvent<HTMLAnchorElement>): void {
  event.preventDefault();
  navigateHomeToSection(SECTION_IDS.work);
}

export function WorkCategoryPage({ slug }: { slug: string }) {
  const { status, category, items, siblings, index } = useWorkCategory(slug);

  useEffect(() => {
    document.title =
      status === 'ready' && category
        ? `${category.title} — Work — ${BASE_TITLE}`
        : status === 'not-found'
          ? `Not found — ${BASE_TITLE}`
          : BASE_TITLE;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [status, category]);

  if (status === 'loading') {
    return (
      <div className={styles.page} role="status" aria-label="Loading work">
        <div className={styles.inner}>
          <div className={cx(styles.skel, styles.skelKicker)} />
          <div className={cx(styles.skel, styles.skelTitle)} />
          <div className={cx(styles.skel, styles.skelLede)} />
          <div className={styles.skelGrid}>
            <div className={styles.skel} />
            <div className={styles.skel} />
          </div>
        </div>
      </div>
    );
  }

  if (status === 'not-found' || !category) {
    return (
      <div className={styles.page}>
        <div className={cx(styles.inner, styles.notFound)}>
          <p className={styles.kicker}>Work</p>
          <h1 className={styles.notFoundTitle}>
            Shelf <em className={styles.serif}>not found</em>
          </h1>
          <p className={styles.lede}>
            This category doesn&rsquo;t exist or is currently hidden.
          </p>
          <ArrowButton href="#/" variant="solid" size="sm" onClick={backToWork}>
            Back to Work
          </ArrowButton>
        </div>
      </div>
    );
  }

  const total = siblings.length;
  const prev = total > 1 ? siblings[(index - 1 + total) % total] : null;
  const next = total > 1 ? siblings[(index + 1) % total] : null;
  /* Only real media is shown — records without uploaded media are hidden
     instead of rendering placeholder tiles. */
  const visibleItems = items.filter((item) => Boolean(item.mediaUrl));

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <a href="#/" className={styles.backLink} onClick={backToWork}>
          <ArrowLeft strokeWidth={1.75} aria-hidden="true" />
          All Work
        </a>

        {visibleItems.length === 0 ? (
          <p className={styles.empty}>No work added yet.</p>
        ) : (
          <ul className={styles.gallery} aria-label={`${category.title} pieces`}>
            {visibleItems.map((item, itemIndex) => (
              <li key={item.id} className={styles.cell}>
                <figure className={styles.figure}>
                  <WorkMedia item={item} eager={itemIndex === 0} card />
                </figure>
              </li>
            ))}
          </ul>
        )}

        <nav className={styles.siblingNav} aria-label="More categories">
          {prev && (
            <a
              href={categoryHref(prev.slug)}
              className={cx(styles.sibling, styles.siblingPrev)}
              aria-label={`Previous category: ${prev.title}`}
            >
              <span className={styles.siblingLabel}>
                <ArrowLeft strokeWidth={1.75} aria-hidden="true" />
                Previous
              </span>
              <span className={styles.siblingTitle}>{prev.title}</span>
            </a>
          )}
          {next && (
            <a
              href={categoryHref(next.slug)}
              className={cx(styles.sibling, styles.siblingNext)}
              aria-label={`Next category: ${next.title}`}
            >
              <span className={styles.siblingLabel}>
                Next
                <ArrowRight strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className={styles.siblingTitle}>{next.title}</span>
            </a>
          )}
        </nav>
      </div>
    </div>
  );
}
