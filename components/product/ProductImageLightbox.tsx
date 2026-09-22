'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import type { DisplayImage } from '@/lib/utils/product';

/**
 * Full-screen product image browser. Opened from the PDP's main image or thumbnail strip.
 *
 * Reuses the a11y wiring `Modal.tsx` already has (focus trap, Escape-to-close via
 * `useFocusTrap`) but is not built on `Modal` itself — `Modal` is a fixed `max-w-lg` dialog with
 * a visible title bar, which does not fit a full-bleed image browser. Arrow-key prev/next is
 * handled locally here rather than added to `useFocusTrap`, since that hook is shared by every
 * other dialog in the app and prev/next is specific to this one.
 */
export function ProductImageLightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: DisplayImage[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasMultiple = images.length > 1;

  const goPrev = () => onIndexChange(index === 0 ? images.length - 1 : index - 1);
  const goNext = () => onIndexChange(index === images.length - 1 ? 0 : index + 1);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    containerRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (hasMultiple && event.key === 'ArrowLeft') {
        goPrev();
      } else if (hasMultiple && event.key === 'ArrowRight') {
        goNext();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- goPrev/goNext close over `index`; re-subscribing per index keypress is intended.
  }, [hasMultiple, index, onClose]);

  const image = images[index];

  if (!image) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      aria-label={`Image ${index + 1} of ${images.length}`}
      aria-modal="true"
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
      role="dialog"
      tabIndex={-1}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-semibold">
          {index + 1} / {images.length}
        </span>
        <Button aria-label="Close image viewer" size="icon" variant="ghost" onClick={onClose}>
          <X aria-hidden="true" className="h-6 w-6 text-white" />
        </Button>
      </div>

      <div className="relative flex-1">
        <Image
          key={image.url}
          alt={image.alt}
          className="object-contain"
          fill
          sizes="100vw"
          src={image.url}
        />

        {hasMultiple ? (
          <>
            <button
              aria-label="Previous image"
              className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
              type="button"
              onClick={goPrev}
            >
              <ChevronLeft aria-hidden="true" className="h-6 w-6" />
            </button>
            <button
              aria-label="Next image"
              className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
              type="button"
              onClick={goNext}
            >
              <ChevronRight aria-hidden="true" className="h-6 w-6" />
            </button>
          </>
        ) : null}
      </div>

      {hasMultiple ? (
        <div className="flex gap-2 overflow-x-auto px-4 py-3">
          {images.map((thumb, thumbIndex) => (
            <button
              key={`${thumb.url}-${thumbIndex}`}
              aria-current={thumbIndex === index}
              aria-label={`View image ${thumbIndex + 1}`}
              className={cn(
                'relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2',
                thumbIndex === index ? 'border-white' : 'border-transparent opacity-70'
              )}
              type="button"
              onClick={() => onIndexChange(thumbIndex)}
            >
              <Image alt={thumb.alt} className="object-cover" fill sizes="64px" src={thumb.url} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
