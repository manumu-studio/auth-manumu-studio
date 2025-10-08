export type SignupFormProps = {
  className?: string;
  // Called when signup succeeds
  onSuccess?: () => void;
  // Called when signup fails
  onError?: (message: string) => void;
  // Optional field defaults
  defaultValues?: {
    name?: string;
    email?: string;
    country?: string;
    city?: string;
    address?: string;
  };
};
