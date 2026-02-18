'use client';

// Main sidebar navigation component with collapse/expand and mobile overlay support

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import type { SidebarProps, NavItem } from './Sidebar.types';
import styles from './Sidebar.module.scss';

export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();

  // Navigation items with SVG icons
  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 10L10 3L17 10V17C17 17.5304 16.7893 18.0391 16.4142 18.4142C16.0391 18.7893 15.5304 19 15 19H5C4.46957 19 3.96086 18.7893 3.58579 18.4142C3.21071 18.0391 3 17.5304 3 17V10Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      label: 'Profile',
      href: '/dashboard/profile',
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M16 17V15C16 13.9391 15.5786 12.9217 14.8284 12.1716C14.0783 11.4214 13.0609 11 12 11H6C4.93913 11 3.92172 11.4214 3.17157 12.1716C2.42143 12.9217 2 13.9391 2 15V17"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="9"
            cy="5"
            r="3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      label: 'Settings',
      href: '/dashboard/settings',
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 12C11.1046 12 12 11.1046 12 10C12 8.89543 11.1046 8 10 8C8.89543 8 8 8.89543 8 10C8 11.1046 8.89543 12 10 12Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16 10C16 10.3 15.96 10.59 15.9 10.87L17.5 12.17C17.63 12.27 17.66 12.46 17.57 12.6L16.07 15.4C15.98 15.54 15.8 15.59 15.65 15.54L13.77 14.8C13.32 15.16 12.83 15.46 12.3 15.68L12 17.71C11.98 17.87 11.84 18 11.67 18H8.67C8.5 18 8.36 17.87 8.34 17.71L8.04 15.68C7.51 15.46 7.02 15.16 6.57 14.8L4.69 15.54C4.54 15.59 4.36 15.54 4.27 15.4L2.77 12.6C2.68 12.46 2.71 12.27 2.84 12.17L4.44 10.87C4.38 10.59 4.34 10.3 4.34 10C4.34 9.7 4.38 9.41 4.44 9.13L2.84 7.83C2.71 7.73 2.68 7.54 2.77 7.4L4.27 4.6C4.36 4.46 4.54 4.41 4.69 4.46L6.57 5.2C7.02 4.84 7.51 4.54 8.04 4.32L8.34 2.29C8.36 2.13 8.5 2 8.67 2H11.67C11.84 2 11.98 2.13 12 2.29L12.3 4.32C12.83 4.54 13.32 4.84 13.77 5.2L15.65 4.46C15.8 4.41 15.98 4.46 16.07 4.6L17.57 7.4C17.66 7.54 17.63 7.73 17.5 7.83L15.9 9.13C15.96 9.41 16 9.7 16 10Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
  ];

  // Animation variants
  const sidebarVariants = {
    expanded: { width: 240 },
    collapsed: { width: 64 },
  };

  const backdropVariants = {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
  };

  const easingCurve: [number, number, number, number] = [0.16, 1, 0.3, 1];

  // Render sidebar content
  const renderSidebarContent = (isMobile: boolean) => (
    <motion.aside
      className={`${styles.sidebar} ${collapsed && !isMobile ? styles.collapsed : ''}`}
      initial={false}
      animate={collapsed && !isMobile ? 'collapsed' : 'expanded'}
      variants={!isMobile ? sidebarVariants : undefined}
      transition={{ duration: 0.4, ease: easingCurve }}
    >
      {/* Logo section */}
      <div className={styles.logoContainer}>
        <picture>
          <source
            srcSet="/assets/logo-white.webp"
            media="(prefers-color-scheme: dark)"
          />
          <Image
            src="/assets/logo-black.webp"
            alt="Logo"
            width={collapsed && !isMobile ? 32 : 120}
            height={32}
            className={styles.logo}
            priority
          />
        </picture>
      </div>

      {/* Navigation section */}
      <nav className={styles.nav}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              onClick={isMobile ? onMobileClose : undefined}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {(!collapsed || isMobile) && (
                <span className={styles.navLabel}>{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle button (desktop only) */}
      {!isMobile && (
        <button
          className={styles.collapseToggle}
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <motion.svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.3, ease: easingCurve }}
          >
            <path
              d="M12 16L6 10L12 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        </button>
      )}
    </motion.aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className={styles.desktopSidebar}>{renderSidebarContent(false)}</div>

      {/* Mobile sidebar with overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className={styles.backdrop}
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={backdropVariants}
              transition={{ duration: 0.3 }}
              onClick={onMobileClose}
            />
            {/* Mobile sidebar */}
            <motion.div
              className={styles.mobileSidebar}
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ duration: 0.4, ease: easingCurve }}
            >
              {renderSidebarContent(true)}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
