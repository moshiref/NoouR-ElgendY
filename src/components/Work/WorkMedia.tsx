import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Play } from 'lucide-react';
import type { WorkItem } from '../../data/work';
import { cx } from '../../lib/cx';
import styles from './WorkMedia.module.css';

type WorkMediaProps = {
  item: WorkItem;
  /** Priority media (first paint) loads without waiting for proximity. */
  eager?: boolean;
  /** Uniform card-grid frame (4:5 matte, contain-fit) instead of the
      item's own aspect box. */
  card?: boolean;
};

const aspectClass: Record<WorkItem['aspect'], string> = {
  reel: styles.aspectReel,
  portrait: styles.aspectPortrait,
  square: styles.aspectSquare,
  landscape: styles.aspectLandscape,
  wide: styles.aspectWide,
};

function ambientAllowed(): boolean {
  return (
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function WorkMedia({ item, eager = false, card = false }: WorkMediaProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [attached, setAttached] = useState(eager && Boolean(item.mediaUrl));
  const [playing, setPlaying] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [ambientPaused, setAmbientPaused] = useState(false);
  const poster = item.posterUrl || item.thumbnailUrl;
  const ambient = Boolean(item.mediaType === 'video' && item.autoplay && ambientAllowed());

  /* Attach heavy sources only near the viewport; ambient videos start/stop
     with visibility. One-shot observers, no scroll listeners. */
  useEffect(() => {
    if (!item.mediaUrl || attached) return;
    const el = frameRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setAttached(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          io.disconnect();
          setAttached(true);
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [item.mediaUrl, attached]);

  /* Pause ambient video when it leaves the viewport (saves battery/data). */
  useEffect(() => {
    if (!attached || !ambient) return;
    const el = frameRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const video = videoRef.current;
        if (!video) return;
        if (entry?.isIntersecting) {
          video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [attached, ambient]);

  const startPlayback = () => {
    setAttached(true);
    setPlaying(true);
  };

  useEffect(() => {
    if (item.mediaType === 'video' && (playing || ambient)) {
      videoRef.current?.play().catch(() => undefined);
    }
  }, [playing, ambient, attached, item.mediaType]);

  const toggleAmbient = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  };

  const onAmbientKey = (event: ReactKeyboardEvent<HTMLVideoElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleAmbient();
    }
  };

  /* No media uploaded yet — a designed tile, never a broken image. */
  if (!item.mediaUrl) {
    return (
      <div
        ref={frameRef}
        className={cx(styles.frame, card ? styles.frameCard : aspectClass[item.aspect])}
      >
        <div className={styles.soon} aria-label={`${item.title} — preview coming soon`}>
          <span className={styles.soonKicker}>In curation</span>
          <span className={styles.soonTitle}>Preview coming soon</span>
        </div>
      </div>
    );
  }

  if (item.mediaType === 'image') {
    return (
      <div
        ref={frameRef}
        className={cx(styles.frame, card ? styles.frameCard : aspectClass[item.aspect])}
      >
        {attached ? (
          <img
            className={cx(styles.img, imgLoaded && styles.imgLoaded, card && styles.contain)}
            src={item.mediaUrl}
            alt={item.title || `${item.mediaType} work`}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setImgLoaded(true)}
            draggable={false}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div
      ref={frameRef}
      className={cx(styles.frame, card ? styles.frameCard : aspectClass[item.aspect])}
    >
      {attached && (playing || ambient) ? (
        <>
          <video
            ref={videoRef}
            className={cx(styles.video, card && styles.contain)}
            src={item.mediaUrl}
            poster={poster}
            muted
            loop
            playsInline
            preload="metadata"
            controls={playing && !ambient}
            tabIndex={ambient ? 0 : undefined}
            aria-label={
              ambient
                ? `${ambientPaused ? 'Play' : 'Pause'} ${item.title || `${item.mediaType} work`}`
                : item.title || `${item.mediaType} work`
            }
            onClick={ambient ? toggleAmbient : undefined}
            onKeyDown={ambient ? onAmbientKey : undefined}
            onPlay={() => {
              setPlaying(true);
              setAmbientPaused(false);
            }}
            onPause={() => setAmbientPaused(true)}
          />
          {ambient && ambientPaused && (
            <span className={styles.pausedBadge} aria-hidden="true">
              <Play strokeWidth={1.75} />
            </span>
          )}
        </>
      ) : (
        <button
          type="button"
          className={styles.poster}
          onClick={startPlayback}
          aria-label={`Play ${item.title}`}
        >
          {poster ? (
            <img
              src={poster}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              className={card ? styles.contain : undefined}
            />
          ) : (
            <span className={styles.posterGlyph} aria-hidden="true">
              {item.title.charAt(0)}
            </span>
          )}
          <span className={styles.playBadge} aria-hidden="true">
            <Play strokeWidth={1.75} />
          </span>
        </button>
      )}
    </div>
  );
}
