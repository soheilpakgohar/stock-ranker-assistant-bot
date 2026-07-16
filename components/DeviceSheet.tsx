'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { DeviceDetails } from '@/lib/devices';
import { s } from '@/lib/styles';

/** Format a device price: numeric → Persian digits + "تومان", string → as-is, else empty. */
const fmt = (n: number) => n.toLocaleString('fa-IR');
export const formatPrice = (price: number | string | undefined): string =>
  typeof price === 'number' ? `${fmt(price)} تومان` :
  typeof price === 'string' && price ? price : '';

// Detect prefers-reduced-transparency for the sheet material fallback.
function usePrefersReducedTransparency(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-transparency: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

export function DeviceSheet({
  open,
  device,
  loading,
  error,
  orderSubmitting,
  orderDone,
  orderError,
  onClose,
  onRetry,
  onOrder,
}: {
  open: boolean;
  device: DeviceDetails | null;
  loading: boolean;
  error: string;
  orderSubmitting: boolean;
  orderDone: boolean;
  orderError: string;
  onClose: () => void;
  onRetry: () => void;
  onOrder: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const reduceTransparency = usePrefersReducedTransparency();

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Spring ≈ Apple damping 0.8 / response 0.3 for a momentum-driven sheet.
  const spring = reduceMotion
    ? { duration: 0.2 }
    : { type: 'spring' as const, bounce: 0.2, duration: 0.4 };

  const onDragEnd = useCallback((_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
    if (info.offset.y > 120 || info.velocity.y > 500) onClose();
  }, [onClose]);

  // Photos: prefer the detail's images array, fall back to the single image field.
  const photos = device?.images?.length ? device.images : device?.image ? [device.image] : [];
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const openViewer = useCallback((idx: number) => {
    setViewerIndex(idx);
    setViewerOpen(true);
  }, []);

  const priceText = device ? formatPrice(device.price) : '';
  const specRows: { label: string; value: string }[] = [];
  if (device?.specs?.length) specRows.push(...device.specs);

  return (
    <AnimatePresence>
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          {/* Scrim — dims the list behind the sheet */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}
          />

          {/* Sheet — docks at bottom, slides up/down with a spring */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={spring}
            drag={reduceMotion ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={onDragEnd}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              maxHeight: '85vh',
              overflowY: 'auto',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              background: reduceTransparency ? 'var(--secondary-bg)' : 'rgba(45, 45, 45, 0.82)',
              backdropFilter: reduceTransparency ? undefined : 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: reduceTransparency ? undefined : 'blur(20px) saturate(180%)',
              borderTop: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.3)',
              color: 'var(--text)',
            }}
          >
            {/* Drag handle */}
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--hint)', margin: '8px auto 4px', flexShrink: 0 }} />

            <div style={{ padding: '8px 16px 24px' }}>
              {/* ── Loading skeleton ── */}
              {loading && (
                <>
                  <motion.div animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ width: '100%', height: '160px', borderRadius: '14px', background: 'var(--border)', marginBottom: '16px' }} />
                  <motion.div animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.1 }} style={{ height: '20px', width: '70%', borderRadius: '6px', background: 'var(--border)', marginBottom: '12px' }} />
                  <motion.div animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }} style={{ height: '14px', width: '45%', borderRadius: '6px', background: 'var(--border)' }} />
                </>
              )}

              {/* ── Error state ── */}
              {!loading && error && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '36px', color: 'var(--hint)' }} />
                  <p style={{ marginTop: '12px', fontSize: '14px', color: 'var(--text)' }}>{error}</p>
                  <button onClick={onRetry} style={{ ...s.outlineBtn, marginTop: '12px', display: 'inline-block', width: 'auto', padding: '8px 20px' }}>تلاش مجدد</button>
                </div>
              )}

              {/* ── Order success ── */}
              {!loading && !error && orderDone && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <i className="fa-solid fa-circle-check" style={{ fontSize: '48px', color: '#22c55e' }} />
                  <p style={{ marginTop: '16px', fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>سفارش شما ثبت شد</p>
                  <p style={{ marginTop: '6px', fontSize: '13px', color: 'var(--hint)' }}>به‌زودی با شما تماس می‌گیریم.</p>
                </div>
              )}

              {/* ── Detail content ── */}
              {!loading && !error && !orderDone && device && (
                <>
                  {photos.length > 0 ? (
                    <PhotoGallery
                      photos={photos}
                      name={device.name}
                      index={galleryIndex}
                      onIndexChange={setGalleryIndex}
                      onOpenViewer={openViewer}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '14px', background: 'var(--secondary-bg)', marginBottom: '16px' }}>
                      <i className="fa-solid fa-mobile-screen-button" style={{ fontSize: '56px', color: 'var(--hint)' }} />
                    </div>
                  )}

                  <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text)', marginBottom: '6px' }}>{device.name}</h2>
                  {priceText && (
                    <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--btn)', marginBottom: '16px' }}>{priceText}</p>
                  )}

                  {device.description && (
                    <p style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--hint)', marginBottom: '16px' }}>{device.description}</p>
                  )}

                  {specRows.length > 0 && (
                    <div style={s.card}>
                      {specRows.map((row, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < specRows.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                          <span style={{ fontSize: '13px', color: 'var(--hint)' }}>{row.label}</span>
                          <span style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {orderError && (
                    <p style={{ color: '#e53e3e', fontSize: '13px', margin: '12px 0 0' }}>{orderError}</p>
                  )}

                  <motion.button
                    onClick={onOrder}
                    disabled={orderSubmitting}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', bounce: 0, duration: 0.2 }}
                    style={{ ...s.submitBtn, marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <i className="fa-solid fa-cart-shopping" />
                    <span>{orderSubmitting ? 'در حال ثبت...' : 'ثبت سفارش'}</span>
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>

          {/* Fullscreen photo viewer — overlays on top of the sheet */}
          <PhotoViewer
            photos={photos}
            index={viewerIndex}
            open={viewerOpen}
            onClose={() => setViewerOpen(false)}
            onIndexChange={setViewerIndex}
          />
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Horizontal swipeable photo gallery for the device detail sheet.
 * Snaps between photos with spring physics; tapping a photo opens the
 * fullscreen viewer. Shows dot indicators + a count badge.
 */
function PhotoGallery({
  photos,
  name,
  index,
  onIndexChange,
  onOpenViewer,
}: {
  photos: string[];
  name: string;
  index: number;
  onIndexChange: (i: number) => void;
  onOpenViewer: (i: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the scroll position synced with the active index (dot taps, programmatic).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' });
  }, [index]);

  // Track which photo is in view as the user scrolls.
  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index && i >= 0 && i < photos.length) onIndexChange(i);
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          borderRadius: '14px',
          background: 'var(--secondary-bg)',
          direction: 'ltr',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {photos.map((src, i) => (
          <div
            key={i}
            onClick={() => onOpenViewer(i)}
            style={{
              flex: '0 0 100%',
              scrollSnapAlign: 'start',
              height: '220px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img src={src} alt={`${name} - ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} loading="lazy" />
          </div>
        ))}
      </div>

      {/* Count badge + expand hint */}
      {photos.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => onIndexChange(i)}
              style={{
                width: i === index ? '18px' : '6px',
                height: '6px',
                borderRadius: '3px',
                background: i === index ? 'var(--btn)' : 'var(--border)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                padding: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Fullscreen photo viewer with swipe navigation and tap-to-close.
 * Black scrim, pinch-free, swipe left/right to move between photos.
 */
function PhotoViewer({
  photos,
  index,
  open,
  onClose,
  onIndexChange,
}: {
  photos: string[];
  index: number;
  open: boolean;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !open) return;
    el.scrollTo({ left: index * el.clientWidth });
  }, [index, open]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index && i >= 0 && i < photos.length) onIndexChange(i);
  }

  return (
    <AnimatePresence>
      {open && photos.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.95)' }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: '12px', right: '12px', zIndex: 2,
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)', color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}
          >
            <i className="fa-solid fa-xmark" />
          </button>

          {/* Count badge */}
          {photos.length > 1 && (
            <div style={{ position: 'absolute', top: '18px', left: '12px', zIndex: 2, color: '#fff', fontSize: '13px', fontWeight: 500 }}>
              {index + 1} / {photos.length}
            </div>
          )}

          {/* Swipeable image track — native scroll-snap */}
          <div
            ref={scrollRef}
            onScroll={onScroll}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              scrollbarWidth: 'none',
              direction: 'ltr',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {photos.map((src, i) => (
              <div
                key={i}
                onClick={onClose}
                style={{
                  flex: '0 0 100%',
                  scrollSnapAlign: 'start',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px',
                }}
              >
                <img src={src} alt={`عکس ${i + 1}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
            ))}
          </div>

          {/* Nav arrows (for non-touch / reduced motion) */}
          {photos.length > 1 && (
            <>
              {index > 0 && (
                <button onClick={() => onIndexChange(index - 1)} style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', zIndex: 2, width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fa-solid fa-chevron-right" />
                </button>
              )}
              {index < photos.length - 1 && (
                <button onClick={() => onIndexChange(index + 1)} style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', zIndex: 2, width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fa-solid fa-chevron-left" />
                </button>
              )}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
