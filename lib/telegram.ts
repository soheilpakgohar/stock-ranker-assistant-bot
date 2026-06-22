type InlineKeyboardButton = { text: string; callback_data: string };
type InlineKeyboardMarkup = { inline_keyboard: InlineKeyboardButton[][] };

function base(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');
  return `https://api.telegram.org/bot${token}`;
}

async function telegramRequest(path: string, body: object): Promise<void> {
  const res = await fetch(`${base()}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Telegram API ${path} failed ${res.status}: ${text}`);
  }
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildInlineKeyboard(options: string[]): InlineKeyboardMarkup {
  const rows: InlineKeyboardButton[][] = [];
  for (let i = 0; i < options.length; i += 3) {
    rows.push(
      options.slice(i, i + 3).map((opt) => ({ text: opt, callback_data: opt }))
    );
  }
  return { inline_keyboard: rows };
}

export async function sendMessage(
  chatId: number,
  text: string,
  replyMarkup?: InlineKeyboardMarkup
): Promise<void> {
  await telegramRequest('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: replyMarkup,
  });
}

export async function answerCallbackQuery(callbackQueryId: string): Promise<void> {
  await telegramRequest('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
  });
}

export async function sendToGroup(text: string): Promise<void> {
  const groupId = process.env.TELEGRAM_GROUP_ID;
  if (!groupId) throw new Error('TELEGRAM_GROUP_ID is not set');
  await telegramRequest('sendMessage', {
    chat_id: groupId,
    text,
    parse_mode: 'HTML',
  });
}

export async function setMyCommands(): Promise<void> {
  await telegramRequest('setMyCommands', {
    commands: [
      { command: 'start', description: 'شروع یا راه‌اندازی مجدد ربات' },
    ],
  });
}
