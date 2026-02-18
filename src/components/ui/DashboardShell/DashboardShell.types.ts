// Type definitions for DashboardShell component — the authenticated dashboard layout wrapper

import type { ReactNode } from 'react';

export interface DashboardShellProps {
  children: ReactNode;
  userName: string | null;
  userEmail: string;
}
