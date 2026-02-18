// Settings hub page — links to password, connected accounts, and delete account
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/server/options';
import { redirect } from 'next/navigation';
import SettingsCard from '@/components/ui/SettingsCard';
import styles from './page.module.scss';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/');

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.header}>
        <h1 className={styles.heading}>Settings</h1>
        <p className={styles.subtitle}>Manage your account settings and preferences</p>
      </div>

      {/* Settings cards grid */}
      <div className={styles.grid}>
        <SettingsCard
          title="Password"
          description="Change your account password"
          href="/dashboard/settings/password"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8ZM12 17C10.9 17 10 16.1 10 15C10 13.9 10.9 13 12 13C13.1 13 14 13.9 14 15C14 16.1 13.1 17 12 17ZM15.1 8H8.9V6C8.9 4.29 10.29 2.9 12 2.9C13.71 2.9 15.1 4.29 15.1 6V8Z" fill="#0078d4"/>
            </svg>
          }
        />

        <SettingsCard
          title="Connected Accounts"
          description="Manage your linked sign-in providers"
          href="/dashboard/settings/accounts"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C16.19 13.89 17 15.02 17 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z" fill="#0078d4"/>
            </svg>
          }
        />

        <SettingsCard
          title="Delete Account"
          description="Permanently delete your account and all data"
          href="/dashboard/settings/delete-account"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z" fill="#dc2626"/>
            </svg>
          }
        />
      </div>
    </div>
  );
}
