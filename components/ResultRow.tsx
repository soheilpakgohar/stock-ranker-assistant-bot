'use client';

import { useState } from 'react';

/**
 * A label/value row used inside `s.card` containers.
 * `highlight` makes the value larger and accent-colored (calc results).
 * `copyable` shows a copy-to-clipboard button with a 1.8s "کپی شد" confirmation.
 */
export function ResultRow({
  label,
  value,
  highlight,
  copyable,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0',
        borderBottom: '0.5px solid var(--border)',
      }}
    >
      <span style={{ fontSize: '13px', color: 'var(--hint)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            fontSize: highlight ? '15px' : '13px',
            fontWeight: highlight ? 600 : 400,
            color: highlight ? 'var(--btn)' : 'var(--text)',
          }}
        >
          {value}
        </span>
        {copyable && (
          <button
            onClick={copy}
            style={{
              background: copied ? 'var(--btn)' : 'var(--secondary-bg)',
              color: copied ? 'var(--btn-text)' : 'var(--hint)',
              border: 'none',
              borderRadius: '6px',
              padding: '3px 8px',
              fontSize: '11px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {copied ? (
              <>
                کپی شد <i className="fa-solid fa-check" style={{ marginRight: '2px' }} />
              </>
            ) : (
              'کپی'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
