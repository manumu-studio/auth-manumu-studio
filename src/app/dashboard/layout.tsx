// Dashboard layout — protects all dashboard routes with session validation
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/features/auth/server/options';
import DashboardShell from '@/components/ui/DashboardShell';
import type { ReactNode } from 'react';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
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
