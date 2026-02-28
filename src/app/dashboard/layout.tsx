// Dashboard layout — protects all dashboard routes with session validation
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/server/options';
import { getUserProfile } from '@/features/account/server/queries/getUserProfile';
import DashboardShell from '@/components/ui/DashboardShell';
import type { ReactNode } from 'react';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  const profile = await getUserProfile();

  if (!profile?.profile?.country) {
    redirect('/onboarding');
  }

  return (
    <DashboardShell
      userName={session.user.name ?? null}
      userEmail={session.user.email ?? ''}
    >
      {children}
    </DashboardShell>
  );
}
