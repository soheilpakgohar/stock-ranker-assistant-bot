'use client';

import { useState, useEffect, CSSProperties } from 'react';
import { questions } from '@/lib/questions';

declare global {
  interface Window {
    Telegram: {
      WebApp: {
        expand(): void;
        ready(): void;
        initData: string;
        close(): void;
      };
    };
  }
}

type Tab = 'form' | 'calc' | 'contact';

const round5 = (n: number) => Math.round(n / 10000) * 10000;
const fmt = (n: number) =>
  n.toLocaleString('fa-IR');

export default function Home() {
  const [tab, setTab] = useState<Tab>('form');

  // Form state
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState('');

  // Calc state
  const [price, setPrice] = useState('');
  const [down, setDown] = useState('');
  const [months, setMonths] = useState(6);

  useEffect(() => {
    const tg = window?.Telegram?.WebApp;
    if (tg) {
      tg.expand();
      tg.ready();
    }
  }, []);

  async function handleSubmit() {
    const missing = questions.find((q) => !answers[q.id]?.trim());
    if (missing) {
      setFormError(`لطفاً به سوال "${missing.label}" پاسخ دهید`);
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const initData = window?.Telegram?.WebApp?.initData ?? '';
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, initData }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error === 'unauthorized' ? 'لطفاً از طریق تلگرام وارد شوید' : 'خطا در ارسال اطلاعات');
      }
      setDone(true);
      setTimeout(() => window?.Telegram?.WebApp?.close(), 2500);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'خطا در ارسال اطلاعات');
    } finally {
      setSubmitting(false);
    }
  }

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
  const totalPaid = downNum + monthlyPayment * months;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <main style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 88px' }}>

        {/* ── FORM TAB ── */}
        {tab === 'form' && (
          done ? (
            <div style={{ textAlign: 'center', paddingTop: '60px' }}>
              <div style={{ fontSize: '56px', lineHeight: 1 }}>✅</div>
              <p style={{ marginTop: '20px', fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>
                اطلاعات با موفقیت ارسال شد!
              </p>
              <p style={{ marginTop: '8px', fontSize: '13px', color: 'var(--hint)' }}>
                بزودی با شما تماس خواهیم گرفت.
              </p>
            </div>
          ) : (
            <>
              <h1 style={s.title}>ثبت گوشی برای فروش</h1>
              {questions.map((q) => (
                <div key={q.id} style={{ marginBottom: '20px' }}>
                  <label style={s.label}>{q.label}</label>
                  {q.type === 'user_input' ? (
                    <input
                      type="text"
                      value={answers[q.id] ?? ''}
                      onChange={(e) =>
                        setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                      }
                      style={s.input}
                      placeholder={extractPlaceholder(q.prompt)}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {q.options!.map((opt) => (
                        <button
                          key={opt}
                          onClick={() =>
                            setAnswers((a) => ({ ...a, [q.id]: opt }))
                          }
                          style={s.chip(answers[q.id] === opt)}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {formError && (
                <p style={{ color: '#e53e3e', fontSize: '13px', margin: '4px 0 12px' }}>
                  {formError}
                </p>
              )}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={s.submitBtn}
              >
                {submitting ? 'در حال ارسال...' : 'ارسال اطلاعات'}
              </button>
            </>
          )
        )}

        {/* ── CALC TAB ── */}
        {tab === 'calc' && (
          <>
            <h1 style={s.title}>محاسبه اقساط</h1>

            <div style={{ marginBottom: '16px' }}>
              <label style={s.label}>قیمت کل (تومان)</label>
              <input
                type="number"
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
                {Array.from({ length: 18 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setMonths(n)}
                    style={{ ...s.chip(months === n), minWidth: '40px' }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {downValid && (
              <div style={s.card}>
                <ResultRow label="قیمت کل" value={`${fmt(priceNum)} تومان`} />
                <ResultRow label="پیش‌پرداخت" value={`${fmt(downNum)} تومان`} />
                <ResultRow label="کارمزد تامین مالی" value={`${fmt(financingFee)} تومان`} />
                <ResultRow
                  label={`مبلغ اقساط (${months} قسط)`}
                  value={`${fmt(monthlyPayment)} تومان`}
                  highlight
                />
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
              بدون نیاز به ضامن — اقساط ماهانه ثابت
            </p>
          </>
        )}

        {/* ── CONTACT TAB ── */}
        {tab === 'contact' && (
          <>
            <h1 style={s.title}>تماس با ما</h1>
            <iframe
              src="https://maps.google.com/maps?q=27.2029398,56.3418465&z=17&output=embed"
              style={{
                width: '100%',
                height: '220px',
                border: 'none',
                borderRadius: '12px',
                display: 'block',
              }}
              loading="lazy"
              title="موقعیت فروشگاه"
            />
            <div style={{ ...s.card, margin: '16px 0' }}>
              {/* TODO: fill actual shop info */}
              <ResultRow label="آدرس" value="..." />
              <ResultRow label="ساعت کاری" value="..." />
              <ResultRow label="تلفن" value="..." />
            </div>
            <a
              href="https://maps.google.com/?q=27.2029398,56.3418465"
              target="_blank"
              rel="noreferrer"
              style={s.outlineBtn}
            >
              🗺 باز کردن در گوگل‌مپ
            </a>
            <a
              href="https://artinstoree.com"
              target="_blank"
              rel="noreferrer"
              style={{ ...s.outlineBtn, marginTop: '10px' }}
            >
              🌐 وبسایت فروشگاه
            </a>
          </>
        )}
      </main>

      {/* ── TAB BAR ── */}
      <nav style={s.tabBar}>
        {(
          [
            ['form', '📱', 'ثبت گوشی'],
            ['calc', '💳', 'اقساط'],
            ['contact', '📍', 'تماس'],
          ] as [Tab, string, string][]
        ).map(([id, icon, label]) => (
          <button key={id} onClick={() => setTab(id)} style={s.tabBtn(tab === id)}>
            <span style={{ fontSize: '22px', lineHeight: 1 }}>{icon}</span>
            <span style={{ fontSize: '11px' }}>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function ResultRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
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
      <span
        style={{
          fontSize: highlight ? '15px' : '13px',
          fontWeight: highlight ? 600 : 400,
          color: highlight ? 'var(--btn)' : 'var(--text)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function extractPlaceholder(prompt: string): string {
  const m = prompt.match(/\(([^)]+)\)/);
  return m ? m[1] : '';
}

const s = {
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
