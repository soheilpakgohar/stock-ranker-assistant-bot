'use client';

import { useState, useEffect } from 'react';
import { s } from '@/lib/styles';
import { FormTab } from '@/components/FormTab';
import { CalcTab } from '@/components/CalcTab';
import { InventoryTab } from '@/components/InventoryTab';
import { ContactTab } from '@/components/ContactTab';
import { AppleTab } from '@/components/AppleTab';

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

export default function Home() {
  const [tab, setTab] = useState<Tab>('form');

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <main style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 88px' }}>
        {/* All tabs stay mounted; inactive ones are hidden with display:none
            so their state (e.g. InventoryTab's detail cache, FormTab's answers)
            survives tab switches — matching the pre-refactor behavior. */}
        <div style={{ display: tab === 'form' ? 'block' : 'none' }}><FormTab /></div>
        <div style={{ display: tab === 'calc' ? 'block' : 'none' }}><CalcTab /></div>
        <div style={{ display: tab === 'inventory' ? 'block' : 'none' }}><InventoryTab /></div>
        <div style={{ display: tab === 'contact' ? 'block' : 'none' }}><ContactTab /></div>
        <div style={{ display: tab === 'apple' ? 'block' : 'none' }}><AppleTab /></div>
      </main>

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
