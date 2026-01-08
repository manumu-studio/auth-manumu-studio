'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import type { AuthShellProps } from './AuthShell.types';
import styles from './AuthShell.module.scss';

export default function AuthShell({ children, title, subtitle, animateOnChange = false, direction = 'forward' }: AuthShellProps) {
  const [mounted, setMounted] = useState(false);
  const [contentKey, setContentKey] = useState(0);
  const [titleKey, setTitleKey] = useState(0);
  const [subtitleKey, setSubtitleKey] = useState(0);
  const prevChildrenRef = useRef<React.ReactNode>(children);
  const prevTitleRef = useRef<string | undefined>(title);
  const prevSubtitleRef = useRef<string | undefined>(subtitle);

  // Prevent hydration mismatch by only animating after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Track content changes to trigger animation only on user actions
  useEffect(() => {
    if (!mounted || !animateOnChange) return;
    
    // Check if children actually changed (React creates new references on step change)
    if (prevChildrenRef.current !== children) {
      setContentKey((prev) => prev + 1);
      prevChildrenRef.current = children;
    }
  }, [children, mounted, animateOnChange]);

  // Track title changes to trigger animation only on user actions
  useEffect(() => {
    if (!mounted || !animateOnChange) return;
    
    if (prevTitleRef.current !== title) {
      setTitleKey((prev) => prev + 1);
      prevTitleRef.current = title;
    }
  }, [title, mounted, animateOnChange]);

  // Track subtitle changes to trigger animation only on user actions
  useEffect(() => {
    if (!mounted || !animateOnChange) return;
    
    if (prevSubtitleRef.current !== subtitle) {
      setSubtitleKey((prev) => prev + 1);
      prevSubtitleRef.current = subtitle;
    }
  }, [subtitle, mounted, animateOnChange]);

  return (
    <div 
      className={`${styles.root} min-h-screen flex flex-col md:items-center md:justify-center p-0 md:p-5`}
      role="main"
      aria-label="Authentication"
    >
      <motion.div
        initial={mounted ? { opacity: 0, y: 30 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.4,
          ease: [0.16, 1, 0.3, 1] // Custom easing for smooth Microsoft-style animation
        }}
        className={styles.signInBox}
      >
        {/* Logo - Centered - Fixed position, no animation */}
        <div className={styles.logoContainer}>
          <div className={styles.logoWrapper}>
            <Image 
              src="/assets/logo-black.webp"
              alt="Company Logo"
              fill
              className={`object-contain ${styles.logoLight}`}
              priority
              aria-hidden="false"
            />
            <Image
              src="/assets/logo-white.webp"
              alt="Company Logo"
              fill
              className={`object-contain ${styles.logoDark}`}
              priority
              aria-hidden="false"
            />
          </div>
        </div>

        {/* Title and Subtitle with AnimatePresence for smooth transitions */}
        <div className={styles.titleContainer}>
          <AnimatePresence mode="wait" custom={direction}>
            {title && (
              <motion.h1
                key={titleKey > 0 ? `title-${titleKey}` : 'title-initial'}
                className={styles.title}
                role="heading"
                aria-level={1}
                custom={direction}
                initial={mounted && titleKey > 0 ? {
                  opacity: 0,
                  x: direction === 'forward' ? -40 : 40, // Slide in from opposite direction
                } : false}
                animate={{ 
                  opacity: 1, 
                  x: 0 
                }}
                exit={{
                  opacity: 0,
                  x: direction === 'forward' ? 40 : -40, // Slide out in navigation direction
                }}
                transition={{ 
                  duration: 0.35,
                  ease: [0.16, 1, 0.3, 1]
                }}
              >
                {title}
              </motion.h1>
            )}
          </AnimatePresence>
          <AnimatePresence mode="wait">
            {subtitle && (
              <motion.p
                key={subtitleKey > 0 ? `subtitle-${subtitleKey}` : 'subtitle-initial'}
                className={styles.subtitle}
                initial={mounted && subtitleKey > 0 ? { opacity: 0, y: 6 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ 
                  duration: 0.3,
                  ease: [0.16, 1, 0.3, 1],
                  delay: 0.05
                }}
              >
                {subtitle}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Content with smooth transition animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={contentKey}
            className={styles.content}
            initial={mounted && contentKey > 0 ? { opacity: 0, y: 12, scale: 0.99 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.99 }}
            transition={{ 
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1]
            }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

