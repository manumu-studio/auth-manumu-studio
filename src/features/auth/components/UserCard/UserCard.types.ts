export type UserCardProps = {
  className?: string;
  // Optional: override display name/email/role, else read from session
  name?: string | null;
  email?: string | null;
  role?: 'USER' | 'ADMIN' | string | null;
  imageUrl?: string | null;
  // Event hooks
  onSignOutStart?: () => void;
  onSignOutSuccess?: () => void;
  onSignOutError?: (error: unknown) => void;
};

