import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/lib/telegram';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let update: Record<string, unknown>;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const msg = update.message as Record<string, unknown> | undefined;
    const chatId = (msg?.chat as Record<string, unknown> | undefined)?.id as number | undefined;
    const text = msg?.text as string | undefined;

    if (chatId && (text === '/start' || text === '/restart')) {
      const url = process.env.NEXT_PUBLIC_WEBAPP_URL;
      if (!url) throw new Error('NEXT_PUBLIC_WEBAPP_URL is not set');
      await sendMessage(
        chatId,
        '👋 سلام!\nبرای ثبت گوشی، محاسبه اقساط یا تماس با ما روی دکمه زیر ضربه بزنید:',
        { inline_keyboard: [[{ text: '📱 باز کردن آرتین استور', web_app: { url } }]] },
      );
    }
  } catch (err) {
    console.error('[webhook]', err);
  }

  return NextResponse.json({ ok: true });
}
