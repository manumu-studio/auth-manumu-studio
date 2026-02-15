// Password reset success page
import Link from 'next/link';
import AuthShell from '@/components/ui/AuthShell';

export default function ResetSuccessPage() {
  return (
    <AuthShell
      title="Password reset successful"
      subtitle="Your password has been updated"
      animateOnChange={false}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          You can now sign in with your new password.
        </p>
        <Link
          href="/"
          className="inline-block w-full text-center py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Sign in
        </Link>
      </div>
    </AuthShell>
  );
}
