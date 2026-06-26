'use client';

import { useEffect, type RefObject } from 'react';

const focusableSelector =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap<T extends HTMLElement>(
  ref: RefObject<T | null>,
  enabled: boolean,
  onEscape?: () => void
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const previousFocus = document.activeElement as HTMLElement | null;
    ref.current?.focus();

    return () => {
      previousFocus?.focus();
    };
  }, [enabled, ref]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape?.();
        return;
      }

      if (event.key !== 'Tab' || !ref.current) {
        return;
      }

      const focusable = ref.current.querySelectorAll<HTMLElement>(focusableSelector);

      if (!focusable.length) {
        event.preventDefault();
        ref.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enabled, onEscape, ref]);
}
