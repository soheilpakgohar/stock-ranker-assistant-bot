import { NextRequest, NextResponse } from 'next/server';
import { questions } from '@/lib/questions';
import { sendToGroup, sendPhoto, sendMediaGroup, escapeHtml } from '@/lib/telegram';
import { validateInitData, parseUser } from '@/lib/initData';

function buildSummary(answers: Record<string, string>, user: { id: number; firstName: string; username?: string } | null): string {
  const lines = questions.map(q => `▫️ <b>${q.label}:</b> ${escapeHtml(answers[q.id] ?? '—')}`);
  const nameLink = user
    ? `<a href="tg://user?id=${user.id}">${escapeHtml(user.firstName)}</a>`
    : 'کاربر';
  const usernameLine = user?.username ? `\n🔗 @${escapeHtml(user.username)}` : '';
  return (
    `📋 <b>اطلاعات گوشی</b>\n${'─'.repeat(20)}\n\n` +
    lines.join('\n') +
    `\n\n${'─'.repeat(20)}\n👤 فروشنده: ${nameLink}${usernameLine}`
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Accept multipart/form-data (text fields + optional photo files).
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN ?? '';
  const initData = (form.get('initData') as string) ?? '';
  if (!validateInitData(initData, token)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // Parse answers from the JSON string field.
  let answers: Record<string, string>;
  try {
    answers = JSON.parse((form.get('answers') as string) ?? '{}');
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid answers' }, { status: 400 });
  }

  const missingIds = questions.filter(q => !answers[q.id]?.trim()).map(q => q.id);
  if (missingIds.length > 0) {
    return NextResponse.json({ ok: false, error: 'incomplete', missing: missingIds }, { status: 400 });
  }

  // Collect optional photos (photo0, photo1, photo2) — in-memory only, never persisted.
  const photos = [0, 1, 2]
    .map((i) => form.get(`photo${i}`))
    .filter((f): f is File => f instanceof File && f.size > 0)
    .map((f) => ({ data: f, filename: f.name || 'photo.jpg' }));

  try {
    const user = parseUser(initData);
    const summary = buildSummary(answers, user);
    const dmButton = user?.username
      ? { inline_keyboard: [[{ text: '💬 ارسال پیام به فروشنده', url: `https://t.me/${user.username}` }]] }
      : undefined;
    const groupId = Number(process.env.TELEGRAM_GROUP_ID);

    if (photos.length === 0) {
      // No photos → text-only message (with DM button).
      await sendToGroup(summary, dmButton);
    } else if (photos.length === 1) {
      // 1 photo → sendPhoto with the summary as caption (single message).
      await sendPhoto(groupId, photos[0], summary);
    } else {
      // 2–3 photos → sendMediaGroup album, summary as caption on first photo.
      await sendMediaGroup(groupId, photos, summary);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[submit]', err);
    return NextResponse.json({ ok: false, error: 'send failed' }, { status: 500 });
  }
}
