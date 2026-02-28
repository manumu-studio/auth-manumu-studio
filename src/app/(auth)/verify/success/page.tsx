// Success page shown after a user verifies their email with OTP.
import Link from "next/link";
import AuthShell from "@/components/ui/AuthShell";
import NextButton from "@/components/ui/NextButton";

export default function SuccessPage() {
  return (
    <AuthShell title="Email verified!" subtitle="Your account is now active.">
      <Link href="/">
        <NextButton>Sign in</NextButton>
      </Link>
    </AuthShell>
  );
}
