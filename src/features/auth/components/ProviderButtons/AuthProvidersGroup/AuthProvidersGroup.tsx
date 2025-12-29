"use client";

import { useEffect, useState } from "react";
import { Box, Collapse, Divider } from "@chakra-ui/react";
import styles from "./AuthProvidersGroup.module.scss";
import type { AuthProvidersGroupProps } from "./AuthProvidersGroup.types";

export default function AuthProvidersGroup({
  children,
  topCtaLabel = "Sign In With Email",
  googleSlot,
  footerSlot,
}: AuthProvidersGroupProps) {
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

