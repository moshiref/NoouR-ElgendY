import { Fragment, useRef, type CSSProperties } from 'react';
import { CTA_HREF, SECTION_IDS, STRIP_ITEMS, WORK_HREF } from '../../data/site';
import { usePointerParallax } from '../../hooks/usePointerParallax';
import { MovingStrip } from '../MovingStrip/MovingStrip';
import { ArrowButton } from '../ui/ArrowButton/ArrowButton';
import { EyebrowTypewriter } from './EyebrowTypewriter';
import { HeroVisual } from './HeroVisual';
import styles from './Hero.module.css';

const delay = (ms: number) => ({ '--delay': `${ms}ms` }) as CSSProperties;

const HEADLINE = [
  { text: 'Visuals', delay: 320 },
  { text: 'that feel', delay: 420 },
  { text: 'real.', delay: 520, accent: true },
];

export function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  usePointerParallax(heroRef);

  return (
    <section ref={heroRef} id={SECTION_IDS.home} className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.inner}>
        <div className={styles.head}>
          <p className={`${styles.eyebrow} ${styles.reveal}`} style={delay(220)}>
            <span className={styles.eyebrowRule} aria-hidden="true" />
            <EyebrowTypewriter />
          </p>

          <h1 id="hero-title" className={styles.title}>
            {HEADLINE.map((line) => (
              <Fragment key={line.text}>
                <span className={`${styles.line} ${line.accent ? styles.lineAccent : ''}`}>
                  <span className={styles.lineInner} style={delay(line.delay)}>
                    {line.text}
                  </span>
                </span>{' '}
              </Fragment>
            ))}
          </h1>
        </div>

        <div className={styles.visual}>
          <HeroVisual />
        </div>

        <div className={styles.body}>
          <p className={`${styles.lede} ${styles.reveal}`} style={delay(720)}>
            AI-powered video, UGC, creative design and visual content crafted for modern brands.
          </p>
          <div className={`${styles.actions} ${styles.reveal}`} style={delay(820)}>
            <ArrowButton href={WORK_HREF} variant="solid" className={styles.viewWork}>
              View Work
            </ArrowButton>
            <ArrowButton href={CTA_HREF} variant="outline" hoverLocked>
              Let&rsquo;s Talk
            </ArrowButton>
          </div>
        </div>
      </div>

      <MovingStrip items={STRIP_ITEMS} className={styles.strip} />
    </section>
  );
}
