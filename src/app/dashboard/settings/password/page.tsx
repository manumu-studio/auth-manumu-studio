// Change password settings page — update account password
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/server/options';
import { redirect } from 'next/navigation';
import { getUserProfile } from '@/features/account/server/queries/getUserProfile';
import ChangePasswordForm from '@/features/account/components/ChangePasswordForm';
import Link from 'next/link';
import styles from './page.module.scss';

export default async function PasswordPage() {
  // Session validation
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/');

  // Fetch user profile
  const user = await getUserProfile();
  if (!user) redirect('/');

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
        <h1 className={styles.title}>Change Password</h1>
        <p className={styles.subtitle}>Update your account password</p>
      </div>

      {/* Password form card */}
      <div className={styles.card}>
        <ChangePasswordForm hasPassword={user.hasPassword} />
      </div>
    </div>
  );
}
