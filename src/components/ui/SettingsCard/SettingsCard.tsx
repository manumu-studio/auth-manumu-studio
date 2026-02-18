// Reusable settings card for the settings hub page
import Link from 'next/link';
import type { SettingsCardProps } from './SettingsCard.types';
import styles from './SettingsCard.module.scss';

export default function SettingsCard({ title, description, href, icon }: SettingsCardProps) {
  return (
    <Link href={href} className={styles.card}>
      <div className={styles.content}>
        {/* Icon container */}
        <div className={styles.iconContainer}>
          {icon}
        </div>

        {/* Text content */}
        <div className={styles.textContent}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.description}>{description}</p>
        </div>

        {/* Chevron */}
        <svg
          className={styles.chevron}
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7.5 15L12.5 10L7.5 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </Link>
  );
}
