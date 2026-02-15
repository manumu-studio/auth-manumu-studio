// Password reset error page — shows reason-specific error messages
import Link from 'next/link';
import AuthShell from '@/components/ui/AuthShell';

export default async function ResetErrorPage(props: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await props.searchParams;

  const map = {
    expired: {
      title: "Reset link expired",
      body: "This link has expired. Please request a new password reset.",
    },
    invalid: {
      title: "Invalid reset link",
      body: "This link is invalid or has already been used.",
    },
    default: {
      title: "Reset failed",
      body: "Unable to reset password. Please try again.",
    },
  } as const;

  type ReasonKey = keyof typeof map;

  const key: ReasonKey = (() => {
    switch (reason) {
      case "expired":
      case "invalid":
        return reason;
      default:
        return "default";
    }
  })();

  const { title, body } = map[key];

  return (
    <AuthShell
      title={title}
      subtitle="Something went wrong"
      animateOnChange={false}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">{body}</p>
        <Link
          href="/forgot-password"
          className="inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Request a new reset link
        </Link>
      </div>
    </AuthShell>
  );
}
