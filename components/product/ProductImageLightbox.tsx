'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image, { getImageProps } from 'next/image';
import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { useImageHover } from '@/hooks/useImageHover';
import { cn } from '@/lib/utils/cn';
import type { DisplayImage } from '@/lib/utils/product';

const VIEWER_SIZES = '200vw';
type Point = { x: number; y: number };
type Zoom = Point & { scale: number };
const FIT: Zoom = { x: 0, y: 0, scale: 1 };
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

function fittedSize(frame: HTMLButtonElement, image: HTMLImageElement) {
  const { naturalWidth, naturalHeight } = image;
  if (!naturalWidth || !naturalHeight) return { width: frame.clientWidth, height: frame.clientHeight };
  const ratio = Math.min(frame.clientWidth / naturalWidth, frame.clientHeight / naturalHeight);
  return { width: naturalWidth * ratio, height: naturalHeight * ratio };
}

function ZoomableImage({ image, navigate, onClose }: {
  image: DisplayImage;
  navigate: (direction: number) => void;
  onClose: () => void;
}) {
  const img = useRef<HTMLImageElement>(null);
  const zoom = useRef(FIT);
  const hover = useImageHover();
  const [mode, setMode] = useState<'auto' | 'fit' | 'pinned'>('auto');
  const [imageStatus, setImageStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const gesture = useRef({
    pointers: new Map<number, Point>(),
    start: { x: 0, y: 0 },
    moved: false,
    pinched: false,
    tap: null as (Point & { time: number }) | null,
    touch: false,
  }).current;

  function relative(frame: HTMLButtonElement, point: Point) {
    const box = frame.getBoundingClientRect();
    return { x: point.x - box.left - box.width / 2, y: point.y - box.top - box.height / 2 };
  }

  function overImage(frame: HTMLButtonElement, point: Point, painted = false) {
    if (!img.current) return false;
    const center = relative(frame, point);
    const { width, height } = fittedSize(frame, img.current);
    if (painted) {
      const { transform, transformOrigin } = getComputedStyle(img.current);
      const matrix = new DOMMatrixReadOnly(transform === 'none' ? undefined : transform);
      const [originX, originY] = transformOrigin.split(' ').map(parseFloat);
      const x = (originX - frame.clientWidth / 2) * (1 - matrix.a) + matrix.e;
      const y = (originY - frame.clientHeight / 2) * (1 - matrix.d) + matrix.f;
      return Math.abs(center.x - x) <= width * matrix.a / 2 && Math.abs(center.y - y) <= height * matrix.d / 2;
    }
    const { x, y, scale } = zoom.current;
    return Math.abs(center.x - x) <= width * scale / 2 && Math.abs(center.y - y) <= height * scale / 2;
  }

  function applyZoom(frame: HTMLButtonElement, { x, y, scale }: Zoom) {
    if (!img.current) return;
    const { width, height } = fittedSize(frame, img.current);
    x = clamp(x, Math.max(0, (width * scale - frame.clientWidth) / 2));
    y = clamp(y, Math.max(0, (height * scale - frame.clientHeight) / 2));
    zoom.current = { x, y, scale };
    img.current.style.transform = scale === 1 ? '' : `translate(${x}px, ${y}px) scale(${scale})`;
  }

  function pointerDown(event: PointerEvent<HTMLButtonElement>) {
    gesture.touch = event.pointerType !== 'mouse';
    if (!gesture.touch || gesture.pointers.size >= 2) return;
    const frame = event.currentTarget;
    const point = { x: event.clientX, y: event.clientY };
    if (gesture.pointers.size === 0) {
      gesture.start = point;
      gesture.moved = false;
      gesture.pinched = false;
    } else {
      gesture.pinched = true;
      gesture.tap = null;
    }
    delete frame.dataset.overImage;
    delete frame.dataset.mouseZoom;
    frame.style.removeProperty('--product-zoom-origin');
    setMode('auto');
    gesture.pointers.set(event.pointerId, point);
    frame.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const frame = event.currentTarget;
    const point = { x: event.clientX, y: event.clientY };
    if (event.pointerType === 'mouse') {
      if (zoom.current.scale !== 1) return;
      if (overImage(frame, point)) {
        frame.dataset.overImage = '';
        hover.onPointerMove(event);
      } else {
        delete frame.dataset.overImage;
      }
      return;
    }

    const previous = gesture.pointers.get(event.pointerId);
    if (!previous) return;
    gesture.pointers.set(event.pointerId, point);
    const currentZoom = zoom.current;
    if (gesture.pointers.size === 2) {
      const other = [...gesture.pointers].find(([id]) => id !== event.pointerId)![1];
      const before = relative(frame, midpoint(previous, other));
      const after = relative(frame, midpoint(point, other));
      const scale = Math.max(1, Math.min(4, currentZoom.scale * distance(point, other) / Math.max(1, distance(previous, other))));
      const ratio = scale / currentZoom.scale;
      applyZoom(frame, {
        x: after.x - (before.x - currentZoom.x) * ratio,
        y: after.y - (before.y - currentZoom.y) * ratio,
        scale,
      });
    } else {
      gesture.moved ||= distance(point, gesture.start) > 8;
      if (currentZoom.scale > 1 && (gesture.moved || gesture.pinched)) {
        applyZoom(frame, { ...currentZoom, x: currentZoom.x + point.x - previous.x, y: currentZoom.y + point.y - previous.y });
      }
    }
  }

  function pointerUp(event: PointerEvent<HTMLButtonElement>) {
    if (!gesture.pointers.delete(event.pointerId) || gesture.pointers.size || gesture.pinched) return;
    const frame = event.currentTarget;
    const point = { x: event.clientX, y: event.clientY };
    const dx = point.x - gesture.start.x;
    const dy = point.y - gesture.start.y;
    if (gesture.moved || distance(point, gesture.start) > 8) {
      gesture.tap = null;
      if (zoom.current.scale === 1 && Math.abs(dx) > Math.max(40, Math.abs(dy))) navigate(dx < 0 ? 1 : -1);
    } else if (!overImage(frame, point)) {
      onClose();
    } else {
      const now = performance.now();
      const lastTap = gesture.tap;
      if (lastTap && now - lastTap.time < 320 && distance(lastTap, point) < 32) {
        const center = relative(frame, point);
        applyZoom(frame, zoom.current.scale === 1 ? { x: -center.x, y: -center.y, scale: 2 } : FIT);
        gesture.tap = null;
      } else {
        gesture.tap = { ...point, time: now };
      }
    }
  }

  return (
    <button
      aria-label="Zoom product image"
      className="product-image-zoom product-viewer-image absolute inset-0 w-full touch-none overflow-hidden"
      data-zoom={mode}
      type="button"
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={(event) => {
        gesture.pointers.delete(event.pointerId);
        gesture.pinched = true;
        gesture.tap = null;
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'mouse') return;
        hover.onPointerLeave(event);
        delete event.currentTarget.dataset.overImage;
        setMode((current) => current === 'fit' ? 'auto' : current);
      }}
      onClick={(event) => {
        if (event.detail !== 0 && gesture.touch) return;
        if (event.detail !== 0 && !overImage(event.currentTarget, { x: event.clientX, y: event.clientY }, true)) {
          onClose();
        } else if (zoom.current.scale > 1) {
          applyZoom(event.currentTarget, FIT);
          setMode('fit');
        } else {
          setMode((current) => current === 'pinned' ? 'fit' : 'pinned');
        }
      }}
    >
      <Image
        ref={img}
        alt={image.alt}
        className="pointer-events-none object-contain"
        fill
        loading="eager"
        sizes={VIEWER_SIZES}
        src={image.url}
        onLoad={() => setImageStatus('ready')}
        onError={() => setImageStatus('error')}
      />
      {imageStatus !== 'ready' ? (
        <span role="status" className="pointer-events-none absolute inset-0 grid place-items-center text-sm">
          {imageStatus === 'loading' ? 'Loading image…' : 'Image unavailable'}
        </span>
      ) : null}
    </button>
  );
}

export function ProductImageLightbox({ images, index, onIndexChange, onClose }: {
  images: DisplayImage[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const image = images[index];
  const hasMultiple = images.length > 1;
  const adjacent = (direction: number) => (index + direction + images.length) % images.length;
  const navigate = (direction: number) => {
    if (!hasMultiple) return;
    if (document.activeElement?.classList.contains('product-viewer-image')) closeRef.current?.focus();
    onIndexChange(adjacent(direction));
  };

  useLayoutEffect(() => {
    const dialog = dialogRef.current!;
    const root = document.documentElement;
    const body = document.body;
    const { scrollX, scrollY } = window;
    const gutter = window.innerWidth - root.clientWidth;
    const padding = parseFloat(getComputedStyle(body).paddingRight);
    const previousFocus = document.activeElement as HTMLElement | null;

    body.style.setProperty('--product-viewer-offset', `${-scrollY}px`);
    body.style.setProperty('--product-viewer-left', `${-scrollX}px`);
    body.style.setProperty('--product-viewer-padding', `${padding + gutter}px`);
    root.dataset.productViewerOpen = '';
    dialog.showModal();
    return () => {
      dialog.close();
      delete root.dataset.productViewerOpen;
      body.style.removeProperty('--product-viewer-offset');
      body.style.removeProperty('--product-viewer-left');
      body.style.removeProperty('--product-viewer-padding');
      window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  const neighbors = hasMultiple ? [...new Set([images[adjacent(-1)].url, images[adjacent(1)].url])] : [];

  return (
    <dialog
      ref={dialogRef}
      aria-label="Product image viewer"
      aria-modal="true"
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden overscroll-contain border-0 bg-black p-0 text-white backdrop:bg-black"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          navigate(event.key === 'ArrowLeft' ? -1 : 1);
        } else if (event.key === 'Tab') {
          const buttons = event.currentTarget.querySelectorAll('button');
          const first = buttons[0];
          const last = buttons[buttons.length - 1];
          if (event.target === (event.shiftKey ? first : last)) {
            event.preventDefault();
            (event.shiftKey ? last : first).focus();
          }
        }
      }}
    >
      <div
        className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto] px-[env(safe-area-inset-left)] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
        style={{ paddingRight: 'env(safe-area-inset-right)' }}
        onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      >
        <div className="flex items-center justify-end gap-3 px-4 py-1" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
          {hasMultiple ? <span aria-live="polite" className="mr-auto text-sm font-semibold">{index + 1} / {images.length}</span> : null}
          <button ref={closeRef} aria-label="Close image viewer" className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/20" type="button" onClick={onClose}>
            <X aria-hidden="true" className="h-6 w-6" />
          </button>
        </div>

        <div className="relative min-h-0">
          <ZoomableImage key={`${index}-${image.url}`} image={image} navigate={navigate} onClose={onClose} />
          {hasMultiple ? (
            <>
              <button aria-label="Previous image" className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/75 hover:bg-black" type="button" onClick={() => navigate(-1)}>
                <ChevronLeft aria-hidden="true" className="h-6 w-6" />
              </button>
              <button aria-label="Next image" className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/75 hover:bg-black" type="button" onClick={() => navigate(1)}>
                <ChevronRight aria-hidden="true" className="h-6 w-6" />
              </button>
            </>
          ) : null}
        </div>

        {hasMultiple ? (
          <div className="flex gap-2 overflow-x-auto px-4 py-2">
            {images.map((thumb, thumbIndex) => (
              <button
                key={`${thumb.url}-${thumbIndex}`}
                aria-current={thumbIndex === index}
                aria-label={`View image ${thumbIndex + 1}`}
                className={cn('relative h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 sm:h-16 sm:w-16', thumbIndex === index ? 'border-white' : 'border-transparent opacity-70')}
                type="button"
                onClick={() => onIndexChange(thumbIndex)}
              >
                <Image alt={thumb.alt} className="object-cover" fill sizes="64px" src={thumb.url} />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {neighbors.filter((url) => url !== image.url).map((url) => {
        const { props } = getImageProps({ alt: '', fill: true, sizes: VIEWER_SIZES, src: url });
        return <link key={url} rel="preload" as="image" href={props.srcSet ? undefined : props.src} imageSrcSet={props.srcSet} imageSizes={props.sizes} />;
      })}
    </dialog>
  );
}
