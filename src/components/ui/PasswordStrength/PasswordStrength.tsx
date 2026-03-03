'use client';

// Subtle tooltip showing password requirements with real-time ✓/✗ status
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PASSWORD_RULES } from '@/lib/validation/fields';
import type { PasswordStrengthProps } from './PasswordStrength.types';
import styles from './PasswordStrength.module.scss';

export function PasswordStrength({ value, children, className }: PasswordStrengthProps) {
  const [isIconHovered, setIsIconHovered] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const showTooltip = isIconHovered || isInputFocused;

  // Detect focus within wrapper (password input or trigger)
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as Node;
      if (wrapper.contains(target)) setIsInputFocused(true);
    };

    const handleFocusOut = (e: FocusEvent) => {
      const relatedTarget = e.relatedTarget as Node | null;
      if (!relatedTarget || !wrapper.contains(relatedTarget)) {
        setIsInputFocused(false);
      }
    };

    wrapper.addEventListener('focusin', handleFocusIn);
    wrapper.addEventListener('focusout', handleFocusOut);
    return () => {
      wrapper.removeEventListener('focusin', handleFocusIn);
      wrapper.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={`${styles.wrapper} ${className ?? ''}`.trim()}
    >
      <div className={styles.inputRow}>
        <div className={styles.inputSlot}>{children}</div>
        <button
          type="button"
          className={styles.trigger}
          aria-label="Password requirements"
          aria-expanded={showTooltip}
          onMouseEnter={() => setIsIconHovered(true)}
          onMouseLeave={() => setIsIconHovered(false)}
        >
          <span aria-hidden>i</span>
        </button>
      </div>
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            className={styles.tooltip}
            role="tooltip"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            <ul className={styles.list}>
              {PASSWORD_RULES.map((rule) => {
                const met = rule.test(value);
                return (
                  <li key={rule.id} className={styles.item}>
                    <span
                      className={`${styles.icon} ${met ? styles.iconMet : styles.iconUnmet}`}
                      aria-hidden
                    >
                      {met ? '✓' : '✗'}
                    </span>
                    <span className={`${styles.label} ${met ? styles.labelMet : ''}`}>
                      {rule.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
