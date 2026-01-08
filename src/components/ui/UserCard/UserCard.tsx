'use client';

import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import type { UserCardProps } from './UserCard.types';
import styles from './UserCard.module.scss';

/**
 * Sophisticated UserCard component displaying user profile information
 * 
 * Features:
 * - Animated card entrance with stagger effects
 * - Beautiful gradient avatar with initials fallback
 * - Role badge with color coding and pulse animation
 * - Online status indicator with pulse effect
 * - Smooth hover effects and micro-interactions
 * - Dark mode support with gradient backgrounds
 * - Fully responsive design
 * - Professional polish and attention to detail
 */
export default function UserCard({ className }: UserCardProps) {
  const { data, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (status !== 'authenticated' || !data?.user) return null;

  const name = data.user.name ?? '';
  const email = data.user.email ?? '';
  const role = (data.user.role as 'USER' | 'ADMIN') ?? 'USER';
  
  // Generate initials from name or email
  const getInitials = () => {
    if (name) {
      const parts = name.trim().split(' ').filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email[0]?.toUpperCase() ?? 'U';
    }
    return 'U';
  };

  const initials = getInitials();

  // Role badge colors and styles
  const roleConfig = {
    USER: {
      colors: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      icon: '👤',
    },
    ADMIN: {
      colors: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      icon: '👑',
    },
  };

  const roleStyle = roleConfig[role];

  return (
    <motion.div
      initial={mounted ? { opacity: 0, y: 20, scale: 0.95 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1]
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`${styles.card} ${className || ''} w-full max-w-lg mx-auto`}
    >
      <motion.div
        animate={isHovered ? { y: -2 } : { y: 0 }}
        transition={{ duration: 0.2 }}
        className={`${styles.cardWrapper} bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden`}
      >
        {/* Header with gradient */}
        <div className={`${styles.cardHeader} px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-gray-800 dark:via-gray-750 dark:to-gray-800`}>
          <div className="flex items-center justify-between">
            <motion.h2
              initial={mounted ? { opacity: 0, x: -10 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className={`text-xl font-semibold text-gray-900 dark:text-white ${styles.cardText}`}
            >
              Your account
            </motion.h2>
            <motion.span
              initial={mounted ? { opacity: 0, scale: 0.8, rotate: -10 } : false}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, duration: 0.4, type: 'spring', stiffness: 200 }}
              whileHover={{ scale: 1.05, rotate: 2 }}
              className={`${styles.badge} ${roleStyle.colors} px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-sm`}
            >
              <span>{roleStyle.icon}</span>
              <span>{role}</span>
            </motion.span>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <div className="flex items-start space-x-4 mb-6">
            {/* Avatar with sophisticated styling */}
            <motion.div
              initial={mounted ? { opacity: 0, scale: 0.8, rotate: -180 } : false}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, duration: 0.5, type: 'spring', stiffness: 200 }}
              whileHover={{ scale: 1.05, rotate: 5 }}
              className={`${styles.avatar} relative flex-shrink-0`}
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-xl ring-4 ring-white dark:ring-gray-800 relative overflow-hidden">
                {/* Animated background gradient */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400"
                  animate={{
                    backgroundPosition: ['0% 0%', '100% 100%'],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatType: 'reverse',
                  }}
                />
                <span className="text-2xl font-bold text-white relative z-10 drop-shadow-md">
                  {initials}
                </span>
              </div>
              {/* Online status indicator with pulse */}
              <motion.div
                initial={mounted ? { scale: 0 } : false}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
                className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-[3px] border-white dark:border-gray-800 shadow-lg"
              >
                <motion.div
                  className="absolute inset-0 bg-green-500 rounded-full"
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.7, 0, 0.7],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </motion.div>
            </motion.div>

            {/* User Info */}
            <div className="flex-1 min-w-0 pt-1">
              <motion.h3
                initial={mounted ? { opacity: 0, x: -10 } : false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className={`text-xl font-bold text-gray-900 dark:text-white truncate mb-1 ${styles.cardText}`}
              >
                {name || email}
              </motion.h3>
              {email && name && (
                <motion.div
                  initial={mounted ? { opacity: 0, x: -10 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25, duration: 0.3 }}
                  className="flex items-center gap-2"
                >
                  <svg
                    className={`w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 ${styles.cardTextTertiary}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <p className={`text-sm text-gray-500 dark:text-gray-400 truncate ${styles.cardTextSecondary}`}>
                    {email}
                  </p>
                </motion.div>
              )}
              {/* Account metadata */}
              <motion.div
                initial={mounted ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className={`mt-3 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 ${styles.cardTextTertiary}`}
              >
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  Verified
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  Active
                </span>
              </motion.div>
            </div>
          </div>

          {/* Divider */}
          <div className={`my-6 border-t border-gray-200 dark:border-gray-700 ${styles.cardDivider}`}></div>
        </div>
      </motion.div>
    </motion.div>
  );
}

