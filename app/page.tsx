'use client';

import { useState, useEffect, useRef, CSSProperties } from 'react';
import { questions } from '@/lib/questions';

declare global {
  interface Window {
    Telegram: {
      WebApp: {
        expand(): void;
        ready(): void;
        initData: string;
        close(): void;
        colorScheme: 'light' | 'dark';
      };
    };
  }
}

type Tab = 'form' | 'calc' | 'inventory' | 'contact' | 'apple';

// Persian (Jalali) month names, index 1..12.
const PERSIAN_MONTHS = [
  '', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

// Persian numerals 1..31 for the day <option>s.
const PERSIAN_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const round5 = (n: number) => Math.round(n / 10000) * 10000;
const fmt = (n: number) =>
  n.toLocaleString('fa-IR');

export default function Home() {
  const [tab, setTab] = useState<Tab>('form');
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form state
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState('');

  // Calc state
  const [price, setPrice] = useState('');
  const [down, setDown] = useState('');
  const [months, setMonths] = useState(6);
  const [chequeMode, setChequeMode] = useState(false);

  // Apple account state
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [fullName, setFullName] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [email, setEmail] = useState('');
  const [appleSubmitting, setAppleSubmitting] = useState(false);
  const [appleDone, setAppleDone] = useState(false);
  const [appleError, setAppleError] = useState('');

  // Apple account — support button
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportError, setSupportError] = useState('');

  useEffect(() => {
    const tg = window?.Telegram?.WebApp;
    if (tg) {
      tg.expand();
      tg.ready();
      if (tg.colorScheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
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
      closeTimerRef.current = setTimeout(() => window?.Telegram?.WebApp?.close(), 2500);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'خطا در ارسال اطلاعات');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSupport() {
    setSupportError('');
    setSupportSubmitting(true);
    try {
      const initData = window?.Telegram?.WebApp?.initData ?? '';
      const res = await fetch('/api/apple-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error === 'unauthorized' ? 'لطفاً از طریق تلگرام وارد شوید' : 'خطا در ارسال درخواست');
      }
      alert('✅ درخواست پشتیبانی شما ارسال شد. به‌زودی با شما تماس می‌گیریم.');
    } catch (e) {
      setSupportError(e instanceof Error ? e.message : 'خطا در ارسال درخواست');
    } finally {
      setSupportSubmitting(false);
    }
  }

  async function handleAppleSubmit() {
    setAppleError('');
    if (!fullName.trim()) {
      setAppleError('لطفاً نام و نام خانوادگی را وارد کنید');
      return;
    }
    if (!birthDay || !birthMonth || !birthYear) {
      setAppleError('لطفاً تاریخ تولد (روز، ماه، سال) را کامل انتخاب کنید');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setAppleError('لطفاً یک ایمیل معتبر وارد کنید');
      return;
    }
    setAppleSubmitting(true);
    try {
      const initData = window?.Telegram?.WebApp?.initData ?? '';
      const res = await fetch('/api/apple-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          birthDay,
          birthMonth,
          birthYear,
          email: email.trim(),
          initData,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error === 'unauthorized' ? 'لطفاً از طریق تلگرام وارد شوید' : 'خطا در ارسال اطلاعات');
      }
      setAppleDone(true);
      closeTimerRef.current = setTimeout(() => window?.Telegram?.WebApp?.close(), 2500);
    } catch (e) {
      setAppleError(e instanceof Error ? e.message : 'خطا در ارسال اطلاعات');
    } finally {
      setAppleSubmitting(false);
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <main style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 88px' }}>

        {/* ── FORM TAB ── */}
        {tab === 'form' && (
          done ? (
            <div style={{ textAlign: 'center', paddingTop: '60px' }}>
              <i className="fa-solid fa-circle-check" style={{ fontSize: '56px', lineHeight: 1, color: '#22c55e' }} />
              <p style={{ marginTop: '20px', fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>
                اطلاعات با موفقیت ارسال شد!
              </p>
              <p style={{ marginTop: '8px', fontSize: '13px', color: 'var(--hint)' }}>
                بزودی با شما تماس خواهیم گرفت.
              </p>
              <button
                onClick={() => {
                  if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
                  setDone(false); setAnswers({}); setFormError('');
                }}
                style={{ ...s.submitBtn, marginTop: '32px' }}
              >
                ثبت دستگاه جدید
              </button>
            </div>
          ) : (
            <>
              <h1 style={s.title}>ثبت دستگاه برای فروش</h1>
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
        )}

        {/* ── INVENTORY TAB ── */}
        {tab === 'inventory' && (
          <div style={{ textAlign: 'center', paddingTop: '80px' }}>
            <i className="fa-solid fa-bag-shopping" style={{ fontSize: '52px', lineHeight: 1, color: 'var(--hint)' }} />
            <p style={{ marginTop: '20px', fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>
              به زودی
            </p>
            <p style={{ marginTop: '10px', fontSize: '13px', color: 'var(--hint)', lineHeight: 1.6 }}>
              نمایش موجودی فروشگاه<br />در حال آماده‌سازی است.
            </p>
          </div>
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
              <ResultRow label="آدرس" value="بندرعباس-مجتمع بندرعباس مال- طبقه اول واحد ۱۳۹" />
              <ResultRow label="ساعت کاری" value="۱۰ صبح الی ۱۱ شب" />
              <ResultRow label="واحد فروش" value="۰۹۰۳۳۰۳۹۴۳۵" copyable />
              <ResultRow label="مدیریت" value="۰۹۱۷۹۷۷۵۷۹۸" copyable />
            </div>
            <a
              href="https://maps.google.com/?q=27.2029398,56.3418465"
              target="_blank"
              rel="noreferrer"
              style={{ ...s.outlineBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <i className="fa-solid fa-map-location-dot" />
              <span>باز کردن در گوگل‌مپ</span>
            </a>
            <a
              href="https://artinstoree.com"
              target="_blank"
              rel="noreferrer"
              style={{ ...s.outlineBtn, marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <i className="fa-solid fa-globe" />
              <span>وبسایت فروشگاه</span>
            </a>
          </>
        )}

        {/* ── APPLE ACCOUNT TAB ── */}
        {tab === 'apple' && (
          appleDone ? (
            <div style={{ textAlign: 'center', paddingTop: '60px' }}>
              <i className="fa-brands fa-apple" style={{ fontSize: '56px', lineHeight: 1, color: 'var(--text)' }} />
              <p style={{ marginTop: '20px', fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>
                درخواست شما با موفقیت ارسال شد!
              </p>
              <p style={{ marginTop: '8px', fontSize: '13px', color: 'var(--hint)' }}>
                به‌زودی برای ساخت حساب اپل با شما تماس می‌گیریم.
              </p>
              <button
                onClick={() => {
                  if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
                  setAppleDone(false);
                  setAccepted(false);
                  setAudioPlayed(false);
                  setFullName('');
                  setBirthDay(''); setBirthMonth(''); setBirthYear('');
                  setEmail('');
                  setAppleError('');
                }}
                style={{ ...s.submitBtn, marginTop: '32px' }}
              >
                ثبت درخواست جدید
              </button>
            </div>
          ) : (
            <>
              <h1 style={s.title}>
                <i className="fa-brands fa-apple" style={{ marginLeft: '6px' }} />
                ساخت حساب اپل (Apple ID)
              </h1>

              {/* Need support button — sends the user's info to the handler */}
              {supportError && (
                <p style={{ color: '#e53e3e', fontSize: '13px', margin: '0 0 8px' }}>
                  {supportError}
                </p>
              )}
              <button
                onClick={handleSupport}
                disabled={supportSubmitting}
                style={{ ...s.outlineBtn, marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {supportSubmitting ? (
                  'در حال ارسال...'
                ) : (
                  <>
                    <i className="fa-solid fa-headset" />
                    <span>نیاز به پشتیبانی دارم</span>
                  </>
                )}
              </button>

              {/* Step 1: listen to the terms audio */}
              <div style={{ ...s.card, padding: '16px 14px', marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', color: 'var(--hint)', marginBottom: '12px' }}>
                  ۱) ابتدا به شرایط و ضوابط ساخت حساب اپل را به‌ طور کامل گوش دهید:
                </p>
                <audio
                  src="/apple-account-terms.m4a"
                  controls
                  preload="metadata"
                  onEnded={() => setAudioPlayed(true)}
                  style={{ width: '100%', direction: 'ltr' }}
                />
                <p style={{ fontSize: '12px', color: audioPlayed ? 'var(--btn)' : 'var(--hint)', marginTop: '10px', textAlign: 'center' }}>
                  {audioPlayed ? (
                    <>
                      <i className="fa-solid fa-check" style={{ marginLeft: '4px' }} />
                      پخش کامل شد
                    </>
                  ) : (
                    'پس از پایان پخش، دکمه‌ی پذیرش فعال می‌شود'
                  )}
                </p>
              </div>

              {/* Agreement switch (disabled until audio finished) */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
                  opacity: audioPlayed ? 1 : 0.4,
                  cursor: audioPlayed ? 'pointer' : 'not-allowed',
                }}
              >
                <span style={{ fontSize: '13px', color: 'var(--text)' }}>
                  شرایط و قوانین را می‌پذیرم
                </span>
                <span
                  onClick={() => { if (audioPlayed) setAccepted((v) => !v); }}
                  style={{
                    width: '42px',
                    height: '24px',
                    borderRadius: '12px',
                    background: accepted ? 'var(--btn)' : 'var(--secondary-bg)',
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
                      right: accepted ? '2px' : '20px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: accepted ? 'var(--btn-text)' : 'var(--hint)',
                      transition: 'right 0.15s',
                    }}
                  />
                </span>
              </label>

              {/* Step 2: form — only revealed after accepting */}
              {accepted && (
                <>
                  <p style={{ fontSize: '13px', color: 'var(--hint)', marginBottom: '16px' }}>
                    ۲) اطلاعات خود را وارد کنید:
                  </p>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={s.label}>نام و نام خانوادگی</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={s.input}
                      placeholder="مثال: علی رضایی"
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={s.label}>تاریخ تولد</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        value={birthDay}
                        onChange={(e) => setBirthDay(e.target.value)}
                        style={{ ...s.input, flex: '0 0 70px' }}
                      >
                        <option value="">روز</option>
                        {PERSIAN_DAYS.map((d) => (
                          <option key={d} value={String(d)}>{d.toLocaleString('fa-IR')}</option>
                        ))}
                      </select>
                      <select
                        value={birthMonth}
                        onChange={(e) => setBirthMonth(e.target.value)}
                        style={{ ...s.input, flex: 1 }}
                      >
                        <option value="">ماه</option>
                        {PERSIAN_MONTHS.slice(1).map((m, i) => (
                          <option key={m} value={String(i + 1)}>{m}</option>
                        ))}
                      </select>
                      <select
                        value={birthYear}
                        onChange={(e) => setBirthYear(e.target.value)}
                        style={{ ...s.input, flex: '0 0 95px' }}
                      >
                        <option value="">سال</option>
                        {Array.from({ length: 106 }, (_, i) => 1405 - i).map((y) => (
                          <option key={y} value={String(y)}>{y.toLocaleString('fa-IR', { useGrouping: false })}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={s.label}>ایمیل</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ ...s.input, direction: 'ltr' }}
                      placeholder="example@email.com"
                      dir="ltr"
                    />
                  </div>

                  {appleError && (
                    <p style={{ color: '#e53e3e', fontSize: '13px', margin: '4px 0 12px' }}>
                      {appleError}
                    </p>
                  )}

                  <button
                    onClick={handleAppleSubmit}
                    disabled={appleSubmitting}
                    style={s.submitBtn}
                  >
                    {appleSubmitting ? 'در حال ارسال...' : 'ارسال درخواست'}
                  </button>
                </>
              )}
            </>
          )
        )}
      </main>

      {/* ── TAB BAR ── */}
      <nav style={s.tabBar}>
        {(
          [
            ['form', 'fa-solid fa-mobile-screen', 'ثبت دستگاه'],
            ['calc', 'fa-solid fa-credit-card', 'اقساط'],
            ['inventory', 'fa-solid fa-bag-shopping', 'موجودی'],
            ['contact', 'fa-solid fa-location-dot', 'تماس'],
            ['apple', 'fa-brands fa-apple', 'اپل'],
          ] as [Tab, string, string][]
        ).map(([id, icon, label]) => (
          <button key={id} onClick={() => setTab(id)} style={s.tabBtn(tab === id)}>
            <i className={icon} style={{ fontSize: '20px', lineHeight: 1, textAlign: 'center' }} />
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
