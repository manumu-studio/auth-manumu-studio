"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Box, Collapse, Divider } from "@chakra-ui/react";
import styles from "./AuthProvidersGroup.module.scss";

type Props = {
  /** Content that appears when the top CTA is expanded (your email/credentials form) */
  children: ReactNode;
  /** Optional label for the top CTA button */
  topCtaLabel?: string;
  /** Optional Google button (or any other provider) */
  googleSlot?: ReactNode;
  /** Optional footer area (e.g., “Create account” link) */
  footerSlot?: ReactNode;
};

export default function AuthProvidersGroup({
  children,
  topCtaLabel = "Sign In With Email",
  googleSlot,
  footerSlot,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  // ensure first "open" animates after hydration
  useEffect(() => setMounted(true), []);

  return (
    <Box>
      <button
        type="button"
        className={styles.topCta}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {topCtaLabel}
      </button>

      {googleSlot ? <Box mt={3}>{googleSlot}</Box> : null}

      <Divider my={6} />

      {mounted && (
        <Collapse in={expanded} animateOpacity unmountOnExit>
          <Box pt={2}>{children}</Box>
        </Collapse>
      )}

      {footerSlot ? <Box mt={6}>{footerSlot}</Box> : null}
    </Box>
  );
}