"use client";

import styles from "./VerifyBanner.module.scss";
import type { VerifyBannerProps } from "./VerifyBanner.types";

export default function VerifyBanner({ email }: VerifyBannerProps) {
  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <div className={styles.emoji}>✉️</div>
      <div>
        <strong>Check your email</strong>
        <p>
          We sent a verification link to <b>{email}</b>. Click the link to activate your account.
        </p>
        <p className={styles.hint}>Didn't get it? Check your spam folder, or try resending below.</p>
      </div>
    </div>
  );
}

