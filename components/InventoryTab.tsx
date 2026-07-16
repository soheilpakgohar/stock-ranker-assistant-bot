'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { normalizeList, normalizeDetail, type DeviceListItem, type DeviceDetails } from '@/lib/devices';
import { s } from '@/lib/styles';
import { useCloseTimer } from '@/lib/useCloseTimer';
import { DeviceSheet, formatPrice } from '@/components/DeviceSheet';

export function InventoryTab() {
  const { schedule } = useCloseTimer();

  // Inventory list
  const [devices, setDevices] = useState<DeviceListItem[]>([]);
  const [invLoading, setInvLoading] = useState(false);
  const [invError, setInvError] = useState('');

  // Sheet + detail
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [detail, setDetail] = useState<DeviceDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  // Client-side detail cache — key = String(device.id). Survives across opens
  // for the component's lifetime; each device is fetched only once.
  const [detailCache, setDetailCache] = useState<Record<string, DeviceDetails>>({});

  // Order (lives inside the sheet)
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderDone, setOrderDone] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Fetch the device list. Called on mount + by the retry button.
  const fetchDevicesList = useCallback(async () => {
    setInvLoading(true);
    setInvError('');
    try {
      const r = await fetch('/api/devices');
      if (!r.ok) throw new Error();
      const raw = await r.json();
      setDevices(normalizeList(raw));
    } catch {
      setInvError('خطا در دریافت لیست دستگاه‌ها');
    } finally {
      setInvLoading(false);
    }
  }, []);

  // Fetch on first mount. The component stays mounted across tab switches
  // (hidden via display:none), so this runs once and the list + detail cache
  // survive navigation.
  useEffect(() => {
    (async () => { await fetchDevicesList(); })();
  }, [fetchDevicesList]);

  // Open the detail sheet — cache-first, fetch on miss.
  const openDevice = useCallback((id: string | number) => {
    const key = String(id);
    setSelectedId(id);
    setOrderDone(false);
    setOrderError('');

    // Cache hit → show instantly, no loading state, no network request.
    const cached = detailCache[key];
    if (cached) {
      setDetail(cached);
      setDetailError('');
      setDetailLoading(false);
      return;
    }
    // Cache miss → fetch, then store in the cache for next time.
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    fetch(`/api/devices/${encodeURIComponent(id)}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((raw) => {
        const d = normalizeDetail(raw);
        setDetail(d);
        if (d) setDetailCache((prev) => ({ ...prev, [key]: d }));
      })
      .catch(() => setDetailError('خطا در دریافت اطلاعات دستگاه'))
      .finally(() => setDetailLoading(false));
  }, [detailCache]);

  const closeSheet = useCallback(() => {
    setSelectedId(null);
    setOrderDone(false);
    setOrderError('');
  }, []);

  // Place an order — sends brief device info + user identity to the group.
  async function handleOrder() {
    const dev = detail ?? devices.find((d) => d.id === selectedId);
    if (!dev) return;
    const initData = window?.Telegram?.WebApp?.initData ?? '';
    setOrderSubmitting(true);
    setOrderError('');
    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device: { id: dev.id, name: dev.name, price: dev.price }, initData }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error === 'unauthorized' ? 'لطفاً از طریق تلگرام وارد شوید' : 'خطا در ثبت سفارش');
      }
      setOrderDone(true);
      schedule(() => closeSheet(), 2500);
    } catch (e) {
      setOrderError(e instanceof Error ? e.message : 'خطا در ثبت سفارش');
    } finally {
      setOrderSubmitting(false);
    }
  }

  return (
    <>
      <h1 style={s.title}>موجودی فروشگاه</h1>

      {invLoading && (
        <div style={s.deviceList}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} style={s.deviceCard}>
              <motion.div
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.12 }}
                style={{ ...s.thumb, background: 'var(--border)' }}
              />
              <div style={{ flex: 1 }}>
                <motion.div
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.12 }}
                  style={s.skeletonRow}
                />
                <motion.div
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.12 + 0.15 }}
                  style={{ ...s.skeletonRow, width: '50%', marginTop: '8px' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {!invLoading && invError && (
        <div style={{ textAlign: 'center', paddingTop: '40px' }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '44px', lineHeight: 1, color: 'var(--hint)' }} />
          <p style={{ marginTop: '16px', fontSize: '14px', color: 'var(--text)' }}>{invError}</p>
          <button
            onClick={fetchDevicesList}
            style={{ ...s.outlineBtn, marginTop: '16px', display: 'inline-block', width: 'auto', padding: '10px 24px' }}
          >
            تلاش مجدد
          </button>
        </div>
      )}

      {!invLoading && !invError && devices.length === 0 && (
        <div style={{ textAlign: 'center', paddingTop: '80px' }}>
          <i className="fa-solid fa-box-open" style={{ fontSize: '52px', lineHeight: 1, color: 'var(--hint)' }} />
          <p style={{ marginTop: '20px', fontSize: '15px', color: 'var(--text)' }}>موجودی خالی است</p>
        </div>
      )}

      {!invLoading && !invError && devices.length > 0 && (
        <div style={s.deviceList}>
          {devices.map((d) => {
            const img = d.image;
            const priceText = formatPrice(d.price);
            const subtitle = [
              d.color,
              typeof d.batteryHealth === 'number' ? `باتری ${d.batteryHealth.toLocaleString('fa-IR')}٪` : null,
            ].filter(Boolean).join(' • ');
            return (
              <motion.button
                key={String(d.id)}
                onClick={() => openDevice(d.id)}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', bounce: 0, duration: 0.2 }}
                style={s.deviceCard}
              >
                {img ? (
                  <img src={img} alt={d.name} style={s.thumb} loading="lazy" />
                ) : (
                  <div style={s.thumbFallback}>
                    <i className="fa-solid fa-mobile-screen-button" style={{ fontSize: '22px', color: 'var(--hint)' }} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.deviceName}>{d.name}</div>
                  {subtitle && (
                    <div style={s.deviceSubtitle}>{subtitle}</div>
                  )}
                  {priceText ? (
                    <div style={s.devicePrice}>{priceText}</div>
                  ) : (
                    <div style={{ ...s.devicePrice, color: 'var(--hint)', fontSize: '12px' }}>استعلام قیمت</div>
                  )}
                </div>
                <i className="fa-solid fa-chevron-left" style={{ fontSize: '14px', color: 'var(--hint)', flexShrink: 0 }} />
              </motion.button>
            );
          })}
        </div>
      )}

      <DeviceSheet
        open={selectedId !== null}
        device={detail}
        loading={detailLoading}
        error={detailError}
        orderSubmitting={orderSubmitting}
        orderDone={orderDone}
        orderError={orderError}
        onClose={closeSheet}
        onRetry={() => selectedId != null && openDevice(selectedId)}
        onOrder={handleOrder}
      />
    </>
  );
}
