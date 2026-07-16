import type { CSSProperties } from 'react';

/**
 * Shared inline-styles object for all tabs and components.
 * Every style uses CSS custom properties (var(--*)) so they adapt to
 * Telegram's theme automatically. Function entries (chip, tabBtn) take
 * an `active` boolean to produce a variant.
 */
export const s = {
  title: {
    fontSize: '17px',
    fontWeight: 600,
    marginBottom: '24px',
    color: 'var(--text)',
  } as CSSProperties,

  label: {
    display: 'block',
    fontSize: '13px',
    color: 'var(--hint)',
    marginBottom: '8px',
  } as CSSProperties,

  input: {
    width: '100%',
    padding: '11px 13px',
    background: 'var(--secondary-bg)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    color: 'var(--text)',
    fontSize: '15px',
    fontFamily: 'inherit',
    direction: 'rtl',
    outline: 'none',
  } as CSSProperties,

  chip: (active: boolean): CSSProperties => ({
    padding: '8px 16px',
    background: active ? 'var(--btn)' : 'var(--secondary-bg)',
    color: active ? 'var(--btn-text)' : 'var(--text)',
    border: active ? 'none' : '1px solid var(--border)',
    borderRadius: '20px',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s',
  }),

  submitBtn: {
    width: '100%',
    padding: '14px',
    background: 'var(--btn)',
    color: 'var(--btn-text)',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  } as CSSProperties,

  photoUpload: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '20px',
    border: '2px dashed var(--border)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  } as CSSProperties,

  photoThumb: {
    position: 'relative',
    width: '72px',
    height: '72px',
    flexShrink: 0,
  } as CSSProperties,

  photoRemove: {
    position: 'absolute',
    top: '-6px',
    insetInlineEnd: '-6px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#e53e3e',
    color: '#fff',
    border: '2px solid var(--bg)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    fontFamily: 'inherit',
  } as CSSProperties,

  card: {
    background: 'var(--secondary-bg)',
    borderRadius: '12px',
    padding: '0 14px',
  } as CSSProperties,

  outlineBtn: {
    display: 'block',
    width: '100%',
    padding: '13px',
    textAlign: 'center',
    background: 'var(--secondary-bg)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    fontSize: '14px',
    textDecoration: 'none',
  } as CSSProperties,

  deviceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  } as CSSProperties,

  deviceCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    background: 'var(--secondary-bg)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'right',
  } as CSSProperties,

  thumb: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    objectFit: 'cover',
    flexShrink: 0,
  } as CSSProperties,

  thumbFallback: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as CSSProperties,

  deviceName: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as CSSProperties,

  deviceSubtitle: {
    fontSize: '12px',
    color: 'var(--hint)',
    marginTop: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as CSSProperties,

  devicePrice: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--btn)',
    marginTop: '2px',
  } as CSSProperties,

  skeletonRow: {
    height: '14px',
    width: '80%',
    borderRadius: '6px',
    background: 'var(--border)',
  } as CSSProperties,

  tabBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    background: 'var(--bg)',
    borderTop: '0.5px solid var(--border)',
    paddingBottom: 'env(safe-area-inset-bottom)',
  } as CSSProperties,

  tabBtn: (active: boolean): CSSProperties => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '3px',
    padding: '10px 0',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: active ? 'var(--btn)' : 'var(--hint)',
    fontFamily: 'inherit',
    transition: 'color 0.15s',
  }),
};
