export interface SignInFormProps {
    /** Optional className to attach to the <form> wrapper */
    className?: string;
    /** Called after a successful sign-in (after session update + toast) */
    onSuccess?: () => void;
    /** Called when sign-in fails (receives a short message) */
    onError?: (message: string) => void;
    /** Initial form values (useful for deep-links or prefilled states) */
    defaultValues?: {
      email?: string;
    };
  }