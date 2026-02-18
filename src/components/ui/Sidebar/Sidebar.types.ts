// Type definitions for Sidebar component

import type { ReactNode } from 'react';

export interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}
