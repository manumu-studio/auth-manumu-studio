// Type definitions for the SearchableSelect component.
export interface SearchableSelectOption {
  value: string;
  label: string;
}

export interface SearchableSelectProps {
  id: string;
  name: string;
  label: string;
  /** Override autocomplete to prevent browser address autofill (default: "off") */
  autoComplete?: 'off' | 'nope' | string;
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}
