'use client';

import { useState } from 'react';
import { s } from '@/lib/styles';
import { ResultRow } from '@/components/ResultRow';

const round5 = (n: number) => Math.round(n / 10000) * 10000;
const fmt = (n: number) => n.toLocaleString('fa-IR');

export function CalcTab() {
  const [price, setPrice] = useState('');
  const [down, setDown] = useState('');
  const [months, setMonths] = useState(6);
  const [chequeMode, setChequeMode] = useState(false);

  // Calc derived values
  const priceNum = parseFloat(price) || 0;
  const downNum = parseFloat(down) || 0;
  const minDown = round5(priceNum * 0.4);
  const downTouched = down !== '';
  const downValid = priceNum > 0 && downNum >= minDown;
  const remainder = priceNum - downNum;
  const financingFee = round5(remainder * 0.05);
  const totalRemainder = round5(remainder + financingFee);
  const monthlyPayment = downValid
    ? round5((totalRemainder * months * 0.05 + totalRemainder) / months)
    : 0;
  const chequeActive = chequeMode && months % 2 === 0;
  const chequeCount = months / 2;
  const monthsM1 = months - 1;
  const chequeAmount = downValid
    ? round5((totalRemainder * monthsM1 * 0.05 + totalRemainder) / months) * 2
    : 0;
  const totalPaid = chequeActive
    ? downNum + chequeAmount * chequeCount
    : downNum + monthlyPayment * months;

  return (
    <>
      <h1 style={s.title}>محاسبه اقساط</h1>

      <div style={{ marginBottom: '16px' }}>
        <label style={s.label}>قیمت کل (تومان)</label>
        <input
          type="number"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          style={s.input}
          placeholder="مثال: ۳۰۰۰۰۰۰۰"
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ ...s.label, display: 'flex', justifyContent: 'space-between' }}>
          <span>مبلغ پیش‌پرداخت (تومان)</span>
          {priceNum > 0 && (
            <span style={{ color: 'var(--hint)', fontSize: '11px' }}>
              حداقل: {fmt(minDown)}
            </span>
          )}
        </label>
        <input
          type="number"
          inputMode="decimal"
          value={down}
          onChange={(e) => setDown(e.target.value)}
          style={{
            ...s.input,
            borderColor:
              priceNum > 0 && downTouched && downNum < minDown
                ? '#e53e3e'
                : undefined,
          }}
          placeholder="مثال: ۱۲۰۰۰۰۰۰"
        />
        {priceNum > 0 && downTouched && downNum < minDown && (
          <p style={{ color: '#e53e3e', fontSize: '12px', marginTop: '6px' }}>
            حداقل پیش‌پرداخت {fmt(minDown)} تومان است
          </p>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={s.label}>تعداد اقساط</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {Array.from({ length: 18 }, (_, i) => i + 1).map((n) => {
            const isDisabled = chequeMode && n % 2 !== 0;
            return (
              <button
                key={n}
                onClick={() => setMonths(n)}
                disabled={isDisabled}
                style={{
                  ...s.chip(months === n),
                  minWidth: '40px',
                  opacity: isDisabled ? 0.35 : 1,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                }}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          opacity: months % 2 !== 0 ? 0.4 : 1,
          cursor: months % 2 !== 0 ? 'not-allowed' : 'pointer',
        }}
      >
        <span style={{ fontSize: '13px', color: 'var(--text)' }}>
          پرداخت با چک (دو ماه یک‌بار)
        </span>
        <span
          onClick={() => {
            if (months % 2 === 0) setChequeMode((v) => !v);
          }}
          style={{
            width: '42px',
            height: '24px',
            borderRadius: '12px',
            background: chequeActive ? 'var(--btn)' : 'var(--secondary-bg)',
            border: '1px solid var(--border)',
            position: 'relative',
            transition: 'background 0.15s',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: chequeActive ? '2px' : '20px',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: chequeActive ? 'var(--btn-text)' : 'var(--hint)',
              transition: 'right 0.15s',
            }}
          />
        </span>
      </label>

      {downValid && (
        <div style={s.card}>
          <ResultRow label="قیمت کل" value={`${fmt(priceNum)} تومان`} />
          <ResultRow label="پیش‌پرداخت" value={`${fmt(downNum)} تومان`} />
          <ResultRow label="کارمزد تامین مالی" value={`${fmt(financingFee)} تومان`} />
          {chequeActive ? (
            <>
              <ResultRow label="تعداد چک" value={`${chequeCount} چک`} />
              <ResultRow label="مبلغ هر چک" value={`${fmt(chequeAmount)} تومان`} highlight />
            </>
          ) : (
            <ResultRow
              label={`مبلغ اقساط (${months} قسط)`}
              value={`${fmt(monthlyPayment)} تومان`}
              highlight
            />
          )}
          <ResultRow label="مجموع پرداخت" value={`${fmt(round5(totalPaid))} تومان`} />
        </div>
      )}

      <p
        style={{
          fontSize: '12px',
          color: 'var(--hint)',
          textAlign: 'center',
          marginTop: '20px',
        }}
      >
        نحوه پرداخت ماهیانه یا دو ماه یکبار با ضمانت طلا به میزان باقیمانده کل با کارمزد و چک صیاد به تعداد اقساط
      </p>
    </>
  );
}
