// Email OTP verification page where users enter a 6-digit code from email.
import { redirect } from "next/navigation";
import AuthShell from "@/components/ui/AuthShell";
import OtpVerificationForm from "@/features/auth/components/OtpVerificationForm";

export default async function VerifyPage(props: {
  searchParams: Promise<{ email?: string; callbackUrl?: string }>;
}) {
  const { email, callbackUrl } = await props.searchParams;
  if (!email) redirect("/");

  return (
    <AuthShell
      title="Check your email"
      subtitle={`We sent a 6-digit code to ${email}`}
    >
      <OtpVerificationForm email={email} callbackUrl={callbackUrl} />
    </AuthShell>
  );
}