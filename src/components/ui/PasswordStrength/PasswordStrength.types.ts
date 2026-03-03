// Props for PasswordStrength tooltip component
export interface PasswordStrengthProps {
  /** Current password value for real-time rule evaluation */
  value: string;
  /** Password input element — tooltip shows when this is focused or when trigger is hovered */
  children: React.ReactNode;
  /** Optional class name for the root element */
  className?: string;
}
