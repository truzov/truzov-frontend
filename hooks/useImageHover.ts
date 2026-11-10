'use client';

import { useEffect, useRef, type PointerEvent } from 'react';

export function useImageHover() {
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return {
    onPointerMove(event: PointerEvent<HTMLButtonElement>) {
      if (event.pointerType !== 'mouse' || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      const { currentTarget, clientX, clientY } = event;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        const { left, top } = currentTarget.getBoundingClientRect();
        currentTarget.dataset.mouseZoom = '';
        currentTarget.style.setProperty('--product-zoom-origin', `${clientX - left}px ${clientY - top}px`);
      });
    },
    onPointerLeave(event: PointerEvent<HTMLButtonElement>) {
      if (event.pointerType !== 'mouse') return;
      cancelAnimationFrame(frame.current);
      delete event.currentTarget.dataset.mouseZoom;
      event.currentTarget.style.removeProperty('--product-zoom-origin');
    },
  };
}
