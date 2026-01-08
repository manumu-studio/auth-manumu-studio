'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { NextButtonProps } from './NextButton.types';
import styles from './NextButton.module.scss';

export default function NextButton({
  children,
  onClick,
  type = 'button',
  isLoading = false,
  disabled = false,
  variant = 'primary',
  className,
}: NextButtonProps) {
  const isDisabled = disabled || isLoading;

  const baseClasses = 'w-full py-2.5 px-3.5 text-[0.9375rem] font-medium rounded transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClasses =
    variant === 'primary'
      ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white focus:ring-blue-500 dark:bg-blue-600 dark:hover:bg-blue-700 dark:active:bg-blue-800'
      : `${styles.secondaryButton} ${className || ''}`;

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`${styles.root} ${baseClasses} ${variantClasses} ${className === 'backButtonDark' ? styles.backButtonDark : ''}`}
      whileHover={!isDisabled ? { scale: 1.01 } : {}}
      whileTap={!isDisabled ? { scale: 0.99 } : {}}
      transition={{ 
        duration: 0.15,
        ease: [0.16, 1, 0.3, 1]
      }}
      aria-busy={isLoading}
      aria-disabled={isDisabled}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center"
          >
            <motion.svg
              className={`${styles.spinner} w-5 h-5 text-current`}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </motion.svg>
          </motion.div>
        ) : (
          <motion.span
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

