import type { CSSProperties } from 'react';
import { CONTACT_DESTINATIONS, SECTION_IDS, SOCIAL_LINKS } from '../../data/site';
import { cx } from '../../lib/cx';
import { useInView } from '../About/useInView';
import styles from './Contact.module.css';
import { InstagramIcon, WhatsappIcon } from './SocialIcons';

const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

export function Contact() {
  const { ref, inView } = useInView<HTMLElement>(0.15);

  return (
    <section
      ref={ref}
      id={SECTION_IDS.contact}
      className={cx(styles.contact, inView && styles.isVisible)}
      aria-labelledby="contact-title"
    >
      <div className={styles.inner}>
        <p className={styles.reveal} style={delay(0)}>
          <span className={styles.kicker}>
            <span className={styles.kickerRule} aria-hidden="true" />
            Contact
          </span>
        </p>

        <h2 id="contact-title" className={cx(styles.headline, styles.reveal)} style={delay(90)}>
          <span className={styles.headlineMain}>
            Let&rsquo;s create
            <br />
            something{' '}
          </span>
          <span className={styles.headlineAccent}>real.</span>
        </h2>

        <p className={cx(styles.lede, styles.reveal)} style={delay(180)}>
          Have a project, idea, or collaboration in mind? Let&rsquo;s turn it into something
          worth seeing.
        </p>

        <ul className={styles.destinations} aria-label="Contact destinations">
          {CONTACT_DESTINATIONS.map((destination, index) => {
            const social = SOCIAL_LINKS[index];
            return (
              <li key={destination.href} className={cx(styles.destination, styles.reveal)} style={delay(240 + index * 110)}>
                <div className={styles.row}>
                  <a
                    href={destination.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.link}
                    aria-label={destination.ariaLabel}
                  >
                    <span className={styles.body}>
                      <span className={styles.label}>{destination.label}</span>
                      <span className={styles.value}>{destination.value}</span>
                      <span className={styles.hint}>{destination.hint}</span>
                    </span>
                  </a>
                  {social && (
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cx(styles.social, styles[social.id])}
                      aria-label={social.ariaLabel}
                    >
                      {social.id === 'whatsapp' ? (
                        <WhatsappIcon className={styles.socialIcon} />
                      ) : (
                        <InstagramIcon className={styles.socialIcon} />
                      )}
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
