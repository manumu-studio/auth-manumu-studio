// Connected accounts settings page — manage linked OAuth providers
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/server/options';
import { redirect } from 'next/navigation';
import { getUserProfile } from '@/features/account/server/queries/getUserProfile';
import ConnectedAccounts from '@/features/account/components/ConnectedAccounts';
import Link from 'next/link';
import styles from './page.module.scss';

export default async function AccountsPage() {
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
        <h1 className={styles.title}>Connected Accounts</h1>
        <p className={styles.subtitle}>Manage your linked sign-in providers</p>
      </div>

      {/* Connected accounts card */}
      <div className={styles.card}>
        <ConnectedAccounts
          providers={user.connectedProviders}
          hasPassword={user.hasPassword}
        />
      </div>
    </div>
  );
}
