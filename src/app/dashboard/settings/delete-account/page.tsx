// Delete account settings page — permanent account deletion with email confirmation
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/server/options';
import { redirect } from 'next/navigation';
import DeleteAccountForm from '@/features/account/components/DeleteAccountForm';
import Link from 'next/link';
import styles from './page.module.scss';

export default async function DeleteAccountPage() {
  // Session validation
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/');

  return (
    <div className={styles.page}>
      {/* Back link + header */}
      <div className={styles.header}>
        <Link href="/dashboard/settings" className={styles.backLink}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path
              d="M12.5 15L7.5 10L12.5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to Settings
        </Link>
        <h1 className={styles.title}>Delete Account</h1>
        <p className={styles.subtitle}>
          Permanently delete your account and all associated data
        </p>
      </div>

      {/* Delete form card */}
      <div className={styles.card}>
        <DeleteAccountForm userEmail={session.user.email ?? ''} />
      </div>
    </div>
  );
}
