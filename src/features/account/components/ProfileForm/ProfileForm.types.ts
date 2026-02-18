// Type definitions for ProfileForm component
import type { UserProfileData } from '@/features/account/server/queries/getUserProfile';

export interface ProfileFormProps {
  user: UserProfileData;
}
