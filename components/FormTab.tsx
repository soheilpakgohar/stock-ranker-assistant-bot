'use client';

import { useState } from 'react';
import { questions } from '@/lib/questions';
import { s } from '@/lib/styles';
import { useCloseTimer } from '@/lib/useCloseTimer';

/**
 * Compress and resize an image File on the client via canvas before upload.
 * Resizes the longest edge to maxDim (1280px), re-encodes as JPEG at quality
 * 0.7 — typically turns a 5–15MB camera photo into ~200–400KB.
 */
async function compressImage(file: File, maxDim = 1280, quality = 0.7): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file; // fallback: send original if canvas unavailable
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await canvas.toDataURL('image/jpeg', quality);
  // toDataURL returns "data:image/jpeg;base64,..." — convert back to a File.
  const base64 = blob.split(',')[1];
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new File([arr], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
}

function extractPlaceholder(prompt: string): string {
  const m = prompt.match(/\(([^)]+)\)/);
  return m ? m[1] : '';
}

export function FormTab() {
  const { schedule, clear } = useCloseTimer();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoError, setPhotoError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState('');

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
      const fd = new FormData();
      fd.append('answers', JSON.stringify(answers));
      fd.append('initData', initData);
      photos.forEach((p, i) => fd.append(`photo${i}`, p));
      const res = await fetch('/api/submit', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error === 'unauthorized' ? 'لطفاً از طریق تلگرام وارد شوید' : 'خطا در ارسال اطلاعات');
      }
      setDone(true);
      schedule(() => window?.Telegram?.WebApp?.close(), 2500);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'خطا در ارسال اطلاعات');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
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
            clear();
            setDone(false); setAnswers({}); setPhotos([]); setFormError(''); setPhotoError('');
          }}
          style={{ ...s.submitBtn, marginTop: '32px' }}
        >
          ثبت دستگاه جدید
        </button>
      </div>
    );
  }

  return (
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

      {/* Photo upload (optional, 0–3 photos, in-memory only) */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ ...s.label, display: 'flex', justifyContent: 'space-between' }}>
          <span>عکس‌های دستگاه (اختیاری)</span>
          <span style={{ color: 'var(--hint)', fontSize: '11px' }}>
            حداکثر ۳ عکس
          </span>
        </label>
        {photos.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {photos.map((p, i) => (
              <div key={i} style={s.photoThumb}>
                <img src={URL.createObjectURL(p)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                  style={s.photoRemove}
                >
                  <i className="fa-solid fa-xmark" style={{ fontSize: '10px' }} />
                </button>
              </div>
            ))}
          </div>
        )}
        {photos.length < 3 && (
          <label style={s.photoUpload}>
            <input
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []).filter(
                  (f) => f.type.startsWith('image/'),
                );
                setPhotoError('');
                // Compress each image (resize + JPEG re-encode) before storing.
                const room = 3 - photos.length;
                const toProcess = files.slice(0, room);
                try {
                  const compressed = await Promise.all(
                    toProcess.map((f) => compressImage(f)),
                  );
                  setPhotos((prev) => [...prev, ...compressed]);
                } catch {
                  setPhotoError('خطا در پردازش عکس');
                }
                e.target.value = '';
              }}
            />
            <i className="fa-solid fa-camera" style={{ fontSize: '20px', color: 'var(--hint)' }} />
            <span style={{ fontSize: '13px', color: 'var(--hint)' }}>افزودن عکس</span>
          </label>
        )}
        {photoError && (
          <p style={{ color: '#e53e3e', fontSize: '12px', marginTop: '6px' }}>{photoError}</p>
        )}
      </div>

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
  );
}
