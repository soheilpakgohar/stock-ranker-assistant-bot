import { NextRequest, NextResponse } from 'next/server';
import { questions } from '@/lib/questions';
import { getSession, saveSession, deleteSession, Session, TelegramUser } from '@/lib/session';
import {
  sendMessage,
  answerCallbackQuery,
  sendToGroup,
  buildInlineKeyboard,
  escapeHtml,
} from '@/lib/telegram';

async function askQuestion(chatId: number, step: number): Promise<void> {
  const q = questions[step];
  if (q.type === 'button') {
    await sendMessage(chatId, q.prompt, buildInlineKeyboard(q.options!));
  } else {
    await sendMessage(chatId, q.prompt);
  }
}

function buildSummary(session: Session): string {
  const { answers, user } = session;
  const lines = questions.map(
    (q) => `▫️ <b>${q.label}:</b> ${escapeHtml(answers[q.id] ?? '—')}`
  );

  const nameLink = `<a href="tg://user?id=${user.id}">${escapeHtml(user.firstName)}</a>`;
  const usernameLine = user.username ? `\n🔗 @${escapeHtml(user.username)}` : '';

  return (
    `📋 <b>اطلاعات گوشی</b>\n${'─'.repeat(20)}\n\n` +
    lines.join('\n') +
    `\n\n${'─'.repeat(20)}\n👤 فروشنده: ${nameLink}${usernameLine}`
  );
}

async function finish(chatId: number, session: Session): Promise<void> {
  const summary = buildSummary(session);
  await Promise.all([sendToGroup(summary), deleteSession(chatId)]);
  await sendMessage(
    chatId,
    '✅ اطلاعات با موفقیت ارسال شد و بزودی به شما پاسخ خواهیم داد!\n\nبرای شروع مجدد /start را ارسال کنید.'
  );
}

async function advance(chatId: number, session: Session, answer: string): Promise<void> {
  const q = questions[session.step];
  session.answers[q.id] = answer;
  session.step += 1;

  if (session.step >= questions.length) {
    await finish(chatId, session);
  } else {
    await saveSession(chatId, session);
    await askQuestion(chatId, session.step);
  }
}

async function startSession(chatId: number, user: TelegramUser): Promise<void> {
  const session: Session = { step: 0, answers: {}, user };
  await saveSession(chatId, session);
  await sendMessage(
    chatId,
    '👋 سلام!\nلطفاً اطلاعات گوشی را وارد کنید.\n\nبرای انصراف در هر مرحله /start را مجدداً ارسال کنید.'
  );
  await askQuestion(chatId, 0);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let update: Record<string, unknown>;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    return await handleUpdate(update);
  } catch (err) {
    console.error('[webhook]', err);
    return NextResponse.json({ ok: true });
  }
}

async function handleUpdate(update: Record<string, unknown>): Promise<NextResponse> {
  if (update.message) {
    const msg = update.message as Record<string, unknown>;
    const chatId: number = (msg.chat as Record<string, unknown>).id as number;
    const text: string = (msg.text as string) ?? '';
    const from = msg.from as Record<string, unknown> | undefined;

    const user: TelegramUser = {
      id: (from?.id as number) ?? chatId,
      firstName: (from?.first_name as string) ?? 'کاربر',
      username: from?.username as string | undefined,
    };

    if (text === '/start' || text === '/restart') {
      await startSession(chatId, user);
      return NextResponse.json({ ok: true });
    }

    const session = await getSession(chatId);

    if (!session) {
      await sendMessage(chatId, '⚠️ برای شروع /start را ارسال کنید.');
      return NextResponse.json({ ok: true });
    }

    if (session.step >= questions.length) {
      await sendMessage(chatId, '⚠️ نشست قبلی منقضی شده. /start را ارسال کنید.');
      return NextResponse.json({ ok: true });
    }

    const currentQ = questions[session.step];

    if (currentQ.type !== 'user_input') {
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

  if (update.callback_query) {
    const cb = update.callback_query as Record<string, unknown>;
    const msg = cb.message as Record<string, unknown> | undefined;
    if (!msg) return NextResponse.json({ ok: true });
    const chatId: number = (msg.chat as Record<string, unknown>).id as number;
    const data: string = (cb.data as string) ?? '';

    await answerCallbackQuery(cb.id as string);

    const session = await getSession(chatId);

    if (!session) {
      await sendMessage(chatId, '⚠️ نشست منقضی شده. /start را ارسال کنید.');
      return NextResponse.json({ ok: true });
    }

    if (session.step >= questions.length) {
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
