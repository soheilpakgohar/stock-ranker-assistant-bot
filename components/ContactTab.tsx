'use client';

import { s } from '@/lib/styles';
import { ResultRow } from '@/components/ResultRow';

export function ContactTab() {
  return (
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
  );
}
