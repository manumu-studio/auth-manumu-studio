export interface AuthShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  animateOnChange?: boolean; // Trigger animations only on user actions
  direction?: 'forward' | 'backward'; // Direction for slide animations
}

