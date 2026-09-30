import styles from './Footer.module.css';

const DEVELOPER_NAME = 'Mohamed Sherif';
const DEVELOPER_WHATSAPP = 'https://wa.me/201274776417';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.credit}>
        <span className={styles.role}>Design &amp; Development</span>
        {' — '}
        <a
          href={DEVELOPER_WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.signature}
          aria-label="Chat with developer Mohamed Sherif on WhatsApp (opens in a new tab)"
        >
          {DEVELOPER_NAME}
        </a>
      </p>
    </footer>
  );
}
