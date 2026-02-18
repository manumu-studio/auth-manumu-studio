// Dashboard shell — client wrapper combining sidebar, top bar, and content area
'use client';

import { useState } from 'react';
import Sidebar from '@/components/ui/Sidebar';
import TopBar from '@/components/ui/TopBar';
import type { DashboardShellProps } from './DashboardShell.types';
import styles from './DashboardShell.module.scss';

export default function DashboardShell({ children, userName, userEmail }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={styles.shell}>
      {/* Sidebar navigation */}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Top bar */}
      <div
        className={`${styles.topBarWrapper} ${collapsed ? styles.topBarCollapsed : styles.topBarExpanded}`}
      >
        <TopBar
          userName={userName}
          userEmail={userEmail}
          onMenuClick={() => setMobileOpen((prev) => !prev)}
        />
      </div>

      {/* Main content area */}
      <main
        className={`${styles.content} ${collapsed ? styles.contentCollapsed : styles.contentExpanded}`}
      >
        {children}
      </main>
    </div>
  );
}
