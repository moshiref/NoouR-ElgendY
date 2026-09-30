import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cx } from '../../../lib/cx';
import styles from './ArrowButton.module.css';

type ArrowButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  variant?: 'solid' | 'outline';
  size?: 'sm' | 'md';
  hideIcon?: boolean;
  hoverLocked?: boolean;
};

/**
 * Link styled as a call-to-action. On hover the arrow exits up-right while a
 * second arrow slides in from the bottom-left.
 */
export function ArrowButton({
  children,
  variant = 'solid',
  size = 'md',
  hideIcon = false,
  hoverLocked = false,
  className,
  ...anchorProps
}: ArrowButtonProps) {
  return (
    <a
      className={cx(styles.button, styles[variant], styles[size], hideIcon && styles.noIcon, hoverLocked && styles.hoverLocked, className)}
      {...anchorProps}
    >
      <span className={styles.label}>{children}</span>
      {!hideIcon && (
        <span className={styles.icon} aria-hidden="true">
          <ArrowUpRight className={styles.arrow} strokeWidth={1.75} />
          <ArrowUpRight className={cx(styles.arrow, styles.arrowNext)} strokeWidth={1.75} />
        </span>
      )}
    </a>
  );
}
