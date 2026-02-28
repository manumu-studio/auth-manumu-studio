// Onboarding page that gates dashboard access until required profile fields are completed.
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import AuthShell from '@/components/ui/AuthShell';
import OnboardingForm from '@/features/account/components/OnboardingForm';
import { getUserProfile } from '@/features/account/server/queries/getUserProfile';
import { authOptions } from '@/features/auth/server/options';

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/');
  }

  const profile = await getUserProfile();

  if (profile?.profile?.country) {
    redirect('/dashboard');
  }

  return (
    <AuthShell
      title="Complete your profile"
      subtitle="Just a few more details before you get started."
    >
      <OnboardingForm userName={session.user.name ?? ''} />
    </AuthShell>
  );
}
