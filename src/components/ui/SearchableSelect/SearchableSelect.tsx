// Searchable dropdown component matching InputField design — filters by label/value, keyboard nav, accessible.
'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SearchableSelectProps } from './SearchableSelect.types';
import styles from './SearchableSelect.module.scss';

const EASING = [0.16, 1, 0.3, 1] as const;

function filterOptions(
  options: { value: string; label: string }[],
  query: string
): { value: string; label: string }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...options];
  return options.filter(
    (o) =>
      o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
  );
}

function getDisplayLabel(
  options: { value: string; label: string }[],
  value: string
): string {
  if (!value) return '';
  const opt = options.find((o) => o.value.toUpperCase() === value.toUpperCase());
  return opt ? `${opt.label} (${opt.value})` : value;
}

export function SearchableSelect({
  id,
  name,
  label,
  options,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  placeholder = '',
  autoComplete = 'nope',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const filteredOptions = useMemo(
    () => filterOptions(options, query),
    [options, query]
  );

  const displayValue = useMemo(() => {
    if (isOpen && query !== undefined) return query;
    return getDisplayLabel(options, value);
  }, [isOpen, query, value, options]);

  const hasValue = value.length > 0 || (isOpen && query.length > 0);
  const shouldFloatLabel = isOpen || hasValue;

  const selectOption = useCallback(
    (opt: { value: string; label: string }) => {
      onChange(opt.value);
      setQuery('');
      setIsOpen(false);
      setHighlightedIndex(0);
    },
    [onChange]
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setHighlightedIndex(0);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setHighlightedIndex(0);
  }, [query, isOpen]);

  useEffect(() => {
    if (!isOpen || filteredOptions.length === 0) return;
    const idx = Math.min(highlightedIndex, filteredOptions.length - 1);
    setHighlightedIndex(idx);
  }, [filteredOptions.length, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const el = listboxRef.current;
    if (!el) return;
    const option = el.querySelector(`[data-index="${highlightedIndex}"]`);
    option?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, isOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [close]);

  const handleFocus = () => {
    if (disabled) return;
    setIsOpen(true);
    setQuery(displayValue.includes(' (') ? '' : displayValue);
  };

  const handleBlur = () => {
    // Delay to allow click on option to fire first
    setTimeout(close, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setQuery('');
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        close();
        inputRef.current?.blur();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((i) =>
          i < filteredOptions.length - 1 ? i + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((i) =>
          i > 0 ? i - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          selectOption(filteredOptions[highlightedIndex]!);
        }
        break;
      default:
        break;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  return (
    <div ref={containerRef} className={`${styles.root} mb-6`}>
      <div className={`${styles.inputWrapper} ${styles.inputContainer}`}>
        <motion.label
          htmlFor={id}
          className={`${styles.label} ${shouldFloatLabel ? styles.labelFloating : styles.labelPlaceholder}`}
          initial={false}
          animate={{
            top: shouldFloatLabel ? '-0.375rem' : '0.5rem',
            fontSize: shouldFloatLabel ? '0.75rem' : '0.9375rem',
          }}
          transition={{ duration: 0.2, ease: EASING }}
        >
          {label}
          {required && <span className={styles.required} aria-label="required">*</span>}
        </motion.label>
        <div className={styles.inputContainerInner}>
          <input type="hidden" name={name} value={value} />
          <input
            ref={inputRef}
            id={id}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            aria-controls={`${id}-listbox`}
            aria-activedescendant={
              isOpen && filteredOptions[highlightedIndex]
                ? `${id}-option-${highlightedIndex}`
                : undefined
            }
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${id}-error` : undefined}
            aria-required={required}
            value={displayValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            readOnly={!isOpen}
            className={`${styles.input} ${error ? styles.inputError : ''} ${isOpen ? styles.inputFocused : ''}`}
            autoComplete={autoComplete}
            data-form-type="other"
            data-lpignore="true"
          />
        </div>
        <AnimatePresence>
          {isOpen && (
            <motion.ul
            ref={listboxRef}
            id={`${id}-listbox`}
            role="listbox"
            aria-label={label}
            className={styles.dropdown}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: EASING }}
          >
            {filteredOptions.length === 0 ? (
              <li className={styles.noResults} role="status">
                No results
              </li>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value.toUpperCase() === value.toUpperCase();
                const isHighlighted = idx === highlightedIndex;
                return (
                  <li
                    key={opt.value}
                    data-index={idx}
                    id={`${id}-option-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    className={`${styles.option} ${isSelected ? styles.optionSelected : ''} ${isHighlighted ? (isSelected ? styles.optionHighlightedSelected : styles.optionHighlighted) : ''}`}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectOption(opt);
                    }}
                  >
                    {opt.label} ({opt.value})
                  </li>
                );
              })
            )}
          </motion.ul>
        )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            id={`${id}-error`}
            className={styles.error}
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.25, ease: EASING }}
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
}
