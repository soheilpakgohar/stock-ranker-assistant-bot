const BASE = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

type InlineKeyboardButton = { text: string; callback_data: string };
type InlineKeyboardMarkup = { inline_keyboard: InlineKeyboardButton[][] };

export function buildInlineKeyboard(options: string[]): InlineKeyboardMarkup {
  // Put up to 3 buttons per row
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
  await fetch(`${BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });
}

export async function answerCallbackQuery(callbackQueryId: string): Promise<void> {
  await fetch(`${BASE}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId }),
  });
}

export async function sendToGroup(text: string): Promise<void> {
  await fetch(`${BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_GROUP_ID,
      text,
      parse_mode: 'HTML',
    }),
  });
}
