type InlineKeyboardButton =
  | { text: string; callback_data: string }
  | { text: string; web_app: { url: string } }
  | { text: string; url: string };
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
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

export async function sendToGroup(text: string, replyMarkup?: InlineKeyboardMarkup): Promise<void> {
  const groupId = process.env.TELEGRAM_GROUP_ID;
  if (!groupId) throw new Error('TELEGRAM_GROUP_ID is not set');
  await sendMessage(Number(groupId), text, replyMarkup);
}
