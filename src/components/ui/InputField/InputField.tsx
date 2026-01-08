'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, forwardRef, useCallback } from 'react';
import type { InputFieldProps } from './InputField.types';
import styles from './InputField.module.scss';

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(function InputField({
  id,
  name,
  type,
  label,
  value,
  onChange,
  error,
  disabled = false,
  autoComplete,
  required = false,
}, ref) {
  const [isFocused, setIsFocused] = useState(false);
  const internalRef = useRef<HTMLInputElement>(null);
  const hasValue = value.length > 0;
  const shouldFloatLabel = isFocused || hasValue;

  // Merge refs: support both callback refs and object refs
  const setRefs = useCallback((node: HTMLInputElement | null) => {
    internalRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
    }
  }, [ref]);

  return (
    <div className={`${styles.root} mb-6`}>
      <div className={`${styles.inputWrapper} ${styles.inputContainer}`}>
        <motion.label
          htmlFor={id}
          className={`${styles.label} ${shouldFloatLabel ? styles.labelFloating : styles.labelPlaceholder}`}
          initial={false}
          animate={{
            top: shouldFloatLabel ? '-0.375rem' : '0.5rem',
            fontSize: shouldFloatLabel ? '0.75rem' : '0.9375rem',
          }}
          transition={{ 
            duration: 0.2, 
            ease: [0.16, 1, 0.3, 1]
          }}
        >
          {label}
          {required && <span className={styles.required} aria-label="required">*</span>}
        </motion.label>
        <div className={styles.inputContainerInner}>
          <input
            ref={setRefs}
            id={id}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            autoComplete={autoComplete}
            required={required}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${id}-error` : undefined}
            aria-required={required}
            className={`${styles.input} ${error ? styles.inputError : ''} ${isFocused ? styles.inputFocused : ''}`}
            placeholder=""
          />
        </div>
      </div>
      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            id={`${id}-error`}
            className={styles.error}
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ 
              duration: 0.25,
              ease: [0.16, 1, 0.3, 1]
            }}
            role="alert"
            aria-live="polite"
          >
            <svg 
              className="w-4 h-4 flex-shrink-0" 
              fill="currentColor" 
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path 
                fillRule="evenodd" 
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
                clipRule="evenodd" 
              />
            </svg>
            <span>{error}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
});

export default InputField;

