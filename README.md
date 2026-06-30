# آرتین استور — تلگرام مینی‌اپ

مینی‌اپ تلگرام برای فروشگاه آرتین استور، ساخته شده با Next.js و قابل استقرار روی Vercel.

**امکانات:**
- ثبت اطلاعات گوشی برای فروش و ارسال خودکار به گروه تلگرام
- محاسبه‌گر اقساط
- موجودی فروشگاه (در حال آماده‌سازی)
- اطلاعات تماس و موقعیت فروشگاه روی نقشه

---

## پیش‌نیازها

1. **ربات تلگرام** — از [@BotFather](https://t.me/BotFather) یک ربات بسازید و توکن آن را بگیرید.
2. **شناسه گروه تلگرام** — ربات را به گروه اضافه کنید و شناسه گروه را پیدا کنید (عدد منفی، مانند `-100123456789`).

---

## استقرار روی Vercel

### ۱. متغیرهای محیطی

فایل `.env.local.example` را به `.env.local` کپی کرده و مقادیر را پر کنید:

```bash
cp .env.local.example .env.local
```

```
TELEGRAM_BOT_TOKEN=<توکن ربات از BotFather>
TELEGRAM_GROUP_ID=<شناسه گروه، مثال: -100123456789>
NEXT_PUBLIC_WEBAPP_URL=<آدرس Vercel بعد از استقرار>
```

### ۲. پوش به GitHub و وصل کردن به Vercel

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin <آدرس ریپو>
git push -u origin main
```

سپس پروژه را در [vercel.com](https://vercel.com) وارد کرده، متغیرهای محیطی را اضافه کنید و deploy کنید.

### ۳. ثبت Webhook تلگرام

پس از اولین استقرار موفق، یک بار این دستور را اجرا کنید:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<vercel-domain>/api/telegram/webhook"
```

### ۴. ثبت دستورات ربات

```bash
curl "https://api.telegram.org/bot<TOKEN>/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{"commands":[{"command":"start","description":"شروع ربات"},{"command":"restart","description":"راه‌اندازی مجدد"}]}'
```

---

## جریان کار

```
کاربر /start می‌فرستد
  → ربات دکمه «باز کردن آرتین استور» را می‌فرستد
  → کاربر مینی‌اپ را در تلگرام باز می‌کند
  → فرم را پر می‌کند و ارسال می‌کند
  → اطلاعات به گروه ارسال می‌شود (با دکمه پیام مستقیم در صورت وجود username)
```

---

## توسعه محلی

```bash
npm install
npm run dev
```

> تست کامل مینی‌اپ فقط داخل تلگرام امکان‌پذیر است. برای تست، یک preview deploy در Vercel بسازید و آدرس آن را در `NEXT_PUBLIC_WEBAPP_URL` قرار دهید.

---

## عیب‌یابی

بررسی وضعیت webhook:

```bash
curl -s "https://api.telegram.org/bot<TOKEN>/getWebhookInfo" | python3 -m json.tool
```
