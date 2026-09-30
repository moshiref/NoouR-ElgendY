import hero560 from '../../assets/hero/hero-560.webp';
import hero941 from '../../assets/hero/hero-941.webp';
import { BRAND } from '../../data/site';
import styles from './HeroVisual.module.css';

const IMAGE_WIDTH = 941;
const IMAGE_HEIGHT = 1672;

/**
 * The portrait as a floating editorial object. Layers, back to front:
 * outlined wordmark → warm halo → orbit ring → tilted, floating cut-out.
 * Each layer reads --px / --py (set on the hero) at a different depth.
 */
export function HeroVisual() {
  return (
    <div className={styles.root}>
      <div className={styles.stage}>
        <span className={styles.wordmark} aria-hidden="true">
          NoouR
        </span>
        <span className={styles.halo} aria-hidden="true" />
        <span className={styles.ring} aria-hidden="true">
          <span className={styles.orbit} />
        </span>

        <div className={styles.tilt}>
          <div className={styles.float}>
            <img
              className={styles.image}
              src={hero941}
              srcSet={`${hero560} 560w, ${hero941} 941w`}
              sizes="(max-width: 900px) 70vw, 34vw"
              width={IMAGE_WIDTH}
              height={IMAGE_HEIGHT}
              alt={`Portrait of ${BRAND} in a patterned headscarf and olive textured top, chin resting on hand`}
              fetchPriority="high"
              decoding="async"
              draggable={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
