// Error page for OTP verification failures with reason-specific messaging.
import Link from "next/link";
import AuthShell from "@/components/ui/AuthShell";
import NextButton from "@/components/ui/NextButton";

export default async function ErrorPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const params = await searchParams;
  const map = {
    expired: { title: "Code expired", body: "Request a new code to continue." },
    "not-found": { title: "Invalid code", body: "The code is invalid or already used." },
    "already-verified": { title: "Email already verified", body: "You can sign in now." },
    "max-attempts": { title: "Too many attempts", body: "Request a new code to try again." },
    "invalid-code": { title: "Wrong code", body: "Check your email and try again." },
    default: { title: "Verification error", body: "Please try again." },
  } as const;

  type ReasonKey = keyof typeof map;

  const reason: ReasonKey = (() => {
    switch (params?.reason) {
      case "expired":
      case "not-found":
      case "already-verified":
      case "max-attempts":
      case "invalid-code":
      case "default":
        return params.reason;
      default:
        return "default";
    }
  })();

  const { title, body } = map[reason];

  return (
    <AuthShell title={title} subtitle={body}>
      <Link href="/">
        <NextButton>Back to sign in</NextButton>
      </Link>
    </AuthShell>
  );
}