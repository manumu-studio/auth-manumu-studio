// Dashboard profile page — displays and edits user profile information
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/server/options';
import { redirect } from 'next/navigation';
import { getUserProfile } from '@/features/account/server/queries/getUserProfile';
import ProfileForm from '@/features/account/components/ProfileForm';
import styles from './page.module.scss';

export default async function ProfilePage() {
  // Session validation
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/');

  // Fetch full profile data
  const user = await getUserProfile();
  if (!user) redirect('/');

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Profile</h1>
        <p className={styles.subtitle}>Manage your personal information</p>
      </div>

      {/* Profile card */}
      <div className={styles.card}>
        <ProfileForm user={user} />
      </div>
    </div>
  );
}
