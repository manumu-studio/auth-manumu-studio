// Reset password page — validates token from URL and shows password form
import { redirect } from 'next/navigation';
import AuthShell from '@/components/ui/AuthShell';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';

export default async function ResetPasswordPage(props: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await props.searchParams;

  // No token in URL → invalid link
  if (!token) {
    redirect('/reset-password/error?reason=invalid');
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a strong password for your account"
      animateOnChange={false}
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
