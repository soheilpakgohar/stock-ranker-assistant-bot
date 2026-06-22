# Artin Store Telegram Bot

ربات تلگرام آرتین استور — جمع‌آوری اطلاعات گوشی و ارسال به گروه تلگرام.

ساخته شده با Next.js و قابل استقرار در Vercel.

---

## پیش‌نیازها

1. **ربات تلگرام** — از [@BotFather](https://t.me/BotFather) یک ربات بسازید و توکن آن را بگیرید.
2. **شناسه گروه تلگرام** — ربات را به گروه اضافه کنید، سپس شناسه گروه را از طریق [@userinfobot](https://t.me/userinfobot) یا API پیدا کنید (عدد منفی است، مانند `-100123456789`).
3. **Upstash Redis** — یک دیتابیس رایگان در [console.upstash.com](https://console.upstash.com) بسازید.

---

## استقرار روی Vercel

### ۱. متغیرهای محیطی

فایل `.env.local.example` را به `.env.local` کپی کرده و مقادیر را پر کنید:

```bash
cp .env.local.example .env.local
```

```
TELEGRAM_BOT_TOKEN=<توکن ربات>
TELEGRAM_GROUP_ID=<شناسه گروه>
UPSTASH_REDIS_REST_URL=<آدرس Redis>
UPSTASH_REDIS_REST_TOKEN=<توکن Redis>
```

### ۲. پوش به GitHub و وصل کردن به Vercel

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin <آدرس ریپو>
git push -u origin main
```

سپس پروژه را در [vercel.com](https://vercel.com) وارد کرده و متغیرهای محیطی را اضافه کنید.

### ۳. ثبت Webhook تلگرام

پس از اولین استقرار موفق، یک بار این دستور را اجرا کنید:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<your-vercel-domain>/api/telegram/webhook"
```

---

## جریان ربات

1. کاربر `/start` می‌فرستد
2. ربات ۱۱ سؤال را به ترتیب می‌پرسد:
   - سؤالات متنی: کاربر تایپ می‌کند
   - سؤالات دکمه‌ای: کاربر روی گزینه کلیک می‌کند
3. پس از آخرین سؤال، خلاصه اطلاعات به گروه ارسال می‌شود
4. کاربر تأییدیه دریافت می‌کند

---

## توسعه محلی

```bash
npm install
npm run dev
```

> نکته: برای تست webhook در محیط محلی، باید یک URL عمومی داشته باشید (مانند یک preview deploy در Vercel).
