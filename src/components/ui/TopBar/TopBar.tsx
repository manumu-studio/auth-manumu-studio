// Fixed top navigation bar with hamburger menu, page title, and user dropdown
'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import type { TopBarProps } from './TopBar.types';
import styles from './TopBar.module.scss';

export default function TopBar({
  userName,
  userEmail,
  pageTitle,
  onMenuClick,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Generate user initials for avatar
  const getInitials = () => {
    if (userName) {
      const parts = userName.trim().split(' ').filter(Boolean);
      const first = parts[0];
      const last = parts[parts.length - 1];
      if (parts.length >= 2 && first && last) {
        return `${first[0]}${last[0]}`.toUpperCase();
      }
      return userName.substring(0, 2).toUpperCase();
    }
    return userEmail.substring(0, 2).toUpperCase();
  };

  // Sign out handler
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <>
      <header className={styles.topBar}>
        <div className={styles.leftSection}>
          {/* Hamburger menu button - mobile only */}
          <button
            className={styles.hamburger}
            onClick={onMenuClick}
            aria-label="Toggle menu"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 5h14M3 10h14M3 15h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {/* Page title */}
          {pageTitle && <h1 className={styles.pageTitle}>{pageTitle}</h1>}
        </div>

        <div className={styles.rightSection}>
          {/* User button with dropdown */}
          <button
            className={styles.userButton}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <div className={styles.avatar}>{getInitials()}</div>
            <span className={styles.userName}>{userName || userEmail}</span>
            <svg
              className={styles.chevron}
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>
                <div className={styles.dropdownName}>{userName || 'User'}</div>
                <div className={styles.dropdownEmail}>{userEmail}</div>
              </div>

              <div className={styles.divider} />

              <Link
                href="/dashboard/profile"
                className={styles.dropdownItem}
                onClick={() => setMenuOpen(false)}
              >
                Profile
              </Link>

              <Link
                href="/dashboard/settings"
                className={styles.dropdownItem}
                onClick={() => setMenuOpen(false)}
              >
                Settings
              </Link>

              <div className={styles.divider} />

              <button
                className={styles.dropdownItem}
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Backdrop to close dropdown */}
      {menuOpen && (
        <div
          className={styles.backdrop}
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}
