// Forgot password page — request a password reset link via email
import AuthShell from '@/components/ui/AuthShell';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link"
      animateOnChange={false}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
