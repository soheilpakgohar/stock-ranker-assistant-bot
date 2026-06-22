export type QuestionType = 'user_input' | 'button';

export interface Question {
  id: string;
  label: string;
  prompt: string;
  type: QuestionType;
  options?: string[];
}

export const questions: Question[] = [
  {
    id: 'model',
    label: 'مدل گوشی',
    prompt: '📱 مدل گوشی را وارد کنید:',
    type: 'user_input',
  },
  {
    id: 'storage',
    label: 'حافظه',
    prompt: '💾 حافظه را وارد کنید (مثال: ۱۲۸GB):',
    type: 'user_input',
  },
  {
    id: 'color',
    label: 'رنگ',
    prompt: '🎨 رنگ را وارد کنید:',
    type: 'user_input',
  },
  {
    id: 'icloud',
    label: 'قفل ایکلود',
    prompt: '🔒 قفل ایکلود:',
    type: 'button',
    options: ['دارد', 'ندارد'],
  },
  {
    id: 'scratches',
    label: 'خط و خش',
    prompt: '🔍 خط و خش:',
    type: 'button',
    options: ['جزیی', 'کم', 'زیاد'],
  },
  {
    id: 'dents',
    label: 'زدگی',
    prompt: '💥 زدگی:',
    type: 'button',
    options: ['دارد', 'ندارد'],
  },
  {
    id: 'hardware',
    label: 'مشکل سخت‌افزاری',
    prompt: '⚙️ مشکل سخت‌افزاری:',
    type: 'button',
    options: ['دارد', 'ندارد'],
  },
  {
    id: 'box',
    label: 'پک اصلی',
    prompt: '📦 پک اصلی:',
    type: 'button',
    options: ['دارد', 'ندارد'],
  },
  {
    id: 'registered',
    label: 'رجیستر',
    prompt: '✅ رجیستر:',
    type: 'button',
    options: ['دارد', 'ندارد'],
  },
  {
    id: 'sim',
    label: 'تعداد سیم',
    prompt: '📶 تعداد سیم‌کارت:',
    type: 'button',
    options: ['۱', '۲'],
  },
  {
    id: 'price',
    label: 'قیمت پیشنهادی',
    prompt: '💰 قیمت پیشنهادی را وارد کنید:',
    type: 'user_input',
  },
];
