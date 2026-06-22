import { NextRequest, NextResponse } from 'next/server';
import { questions } from '@/lib/questions';
import { getSession, saveSession, deleteSession, Session } from '@/lib/session';
import {
  sendMessage,
  answerCallbackQuery,
  sendToGroup,
  buildInlineKeyboard,
} from '@/lib/telegram';

async function askQuestion(chatId: number, step: number): Promise<void> {
  const q = questions[step];
  if (q.type === 'button') {
    await sendMessage(chatId, q.prompt, buildInlineKeyboard(q.options!));
  } else {
    await sendMessage(chatId, q.prompt);
  }
}

function buildSummary(answers: Record<string, string>): string {
  const lines = questions.map((q) => `▫️ <b>${q.label}:</b> ${answers[q.id] ?? '—'}`);
  return `📋 <b>اطلاعات گوشی</b>\n${'─'.repeat(20)}\n\n${lines.join('\n')}`;
}

async function finish(chatId: number, answers: Record<string, string>): Promise<void> {
  const summary = buildSummary(answers);
  await sendToGroup(summary);
  await deleteSession(chatId);
  await sendMessage(
    chatId,
    '✅ اطلاعات با موفقیت ارسال شد!\n\nبرای شروع مجدد /start را ارسال کنید.'
  );
}

async function advance(chatId: number, session: Session, answer: string): Promise<void> {
  const q = questions[session.step];
  session.answers[q.id] = answer;
  session.step += 1;

  if (session.step >= questions.length) {
    await finish(chatId, session.answers);
  } else {
    await saveSession(chatId, session);
    await askQuestion(chatId, session.step);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const update = await req.json();

  // Handle plain text messages
  if (update.message) {
    const msg = update.message;
    const chatId: number = msg.chat.id;
    const text: string = msg.text ?? '';

    if (text === '/start') {
      const session: Session = { step: 0, answers: {} };
      await saveSession(chatId, session);
      await sendMessage(
        chatId,
        '👋 سلام!\nلطفاً اطلاعات گوشی را وارد کنید.\n\nبرای انصراف در هر مرحله /start را مجدداً ارسال کنید.'
      );
      await askQuestion(chatId, 0);
      return NextResponse.json({ ok: true });
    }

    const session = await getSession(chatId);

    if (!session) {
      await sendMessage(chatId, '⚠️ برای شروع /start را ارسال کنید.');
      return NextResponse.json({ ok: true });
    }

    const currentQ = questions[session.step];

    if (currentQ.type !== 'user_input') {
      // Waiting for a button — ignore free text
      await sendMessage(chatId, '👆 لطفاً یکی از گزینه‌های بالا را انتخاب کنید.');
      return NextResponse.json({ ok: true });
    }

    if (!text.trim()) {
      await sendMessage(chatId, '⚠️ پیام خالی است. لطفاً دوباره وارد کنید.');
      return NextResponse.json({ ok: true });
    }

    await advance(chatId, session, text.trim());
    return NextResponse.json({ ok: true });
  }

  // Handle button presses (inline keyboard)
  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId: number = cb.message.chat.id;
    const data: string = cb.data ?? '';

    await answerCallbackQuery(cb.id);

    const session = await getSession(chatId);

    if (!session) {
      await sendMessage(chatId, '⚠️ نشست منقضی شده. /start را ارسال کنید.');
      return NextResponse.json({ ok: true });
    }

    const currentQ = questions[session.step];

    if (currentQ.type !== 'button' || !currentQ.options?.includes(data)) {
      return NextResponse.json({ ok: true });
    }

    await advance(chatId, session, data);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
