// Type definitions for TopBar component

export interface TopBarProps {
  userName: string | null;
  userEmail: string;
  pageTitle?: string;
  onMenuClick: () => void;
}
