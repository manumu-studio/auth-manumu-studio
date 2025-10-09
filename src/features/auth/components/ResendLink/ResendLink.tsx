"use client";

import { useState } from "react";
import styles from "./ResendLink.module.scss";
import type { ResendLinkProps } from "./ResendLink.types";

export default function ResendLink({ email, onSent }: ResendLinkProps) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/verify/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok: boolean; reason?: string };

      if (data.ok) {
        setMsg("✅ Verification email sent! Check your inbox.");
        onSent?.();
      } else if (data.reason === "cooldown") {
        setMsg("⏳ Please wait a bit before requesting another email.");
      } else if (data.reason === "already-verified") {
        setMsg("ℹ️ Your email is already verified. You can sign in.");
      } else {
        setMsg("❌ Unable to send email. Try again later.");
      }
    } catch {
      setMsg("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <button className={styles.linkButton} onClick={onClick} disabled={loading}>
        {loading ? "Sending..." : "Resend verification email"}
      </button>
      {msg && <div className={styles.msg}>{msg}</div>}
    </div>
  );
}

