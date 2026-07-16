'use client';

import { useState } from 'react';
import { s } from '@/lib/styles';
import { useCloseTimer } from '@/lib/useCloseTimer';

// Persian (Jalali) month names, index 1..12.
const PERSIAN_MONTHS = [
  '', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

// Persian numerals 1..31 for the day <option>s.
const PERSIAN_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export function AppleTab() {
  const { schedule, clear } = useCloseTimer();

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
      schedule(() => window?.Telegram?.WebApp?.close(), 2500);
    } catch (e) {
      setAppleError(e instanceof Error ? e.message : 'خطا در ارسال اطلاعات');
    } finally {
      setAppleSubmitting(false);
    }
  }

  if (appleDone) {
    return (
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
            clear();
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
    );
  }

  return (
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
  );
}
