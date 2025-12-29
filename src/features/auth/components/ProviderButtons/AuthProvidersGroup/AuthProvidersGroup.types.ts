import type { ReactNode } from "react";

export type AuthProvidersGroupProps = {
  /** Content that appears when the top CTA is expanded (your email/credentials form) */
  children: ReactNode;
  /** Optional label for the top CTA button */
  topCtaLabel?: string;
  /** Optional Google button (or any other provider) */
  googleSlot?: ReactNode;
  /** Optional footer area (e.g., "Create account" link) */
  footerSlot?: ReactNode;
};

