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

/**
 * Send a JSON-body request to the Telegram Bot API.
 * Returns the parsed `result` from the response (or `undefined` if no result).
 */
async function telegramRequest(path: string, body: object): Promise<unknown> {
  const res = await fetch(`${base()}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Telegram API ${path} failed ${res.status}: ${text}`);
  }
  const json = await res.json();
  return json.result;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Send a text message. Returns the message_id so callers can reply to it
 * (e.g. sending photos as a reply to the text summary).
 */
export async function sendMessage(
  chatId: number,
  text: string,
  replyMarkup?: InlineKeyboardMarkup
): Promise<number> {
  const result = await telegramRequest('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: replyMarkup,
  }) as { message_id: number } | undefined;
  return result?.message_id ?? 0;
}

/**
 * Send a text message to the group. Returns the message_id.
 */
export async function sendToGroup(text: string, replyMarkup?: InlineKeyboardMarkup): Promise<number> {
  const groupId = process.env.TELEGRAM_GROUP_ID;
  if (!groupId) throw new Error('TELEGRAM_GROUP_ID is not set');
  return sendMessage(Number(groupId), text, replyMarkup);
}

/**
 * Send a single photo via multipart/form-data. The photo bytes flow straight
 * to Telegram and are never written to disk. Returns the message_id.
 */
export async function sendPhoto(
  chatId: number,
  photo: { data: Blob; filename: string },
  caption: string,
  replyToMessageId?: number,
): Promise<number> {
  const fd = new FormData();
  fd.append('chat_id', String(chatId));
  fd.append('photo', photo.data, photo.filename);
  fd.append('caption', caption);
  fd.append('parse_mode', 'HTML');
  if (replyToMessageId) {
    fd.append('reply_parameters', JSON.stringify({ message_id: replyToMessageId }));
  }

  const res = await fetch(`${base()}/sendPhoto`, { method: 'POST', body: fd });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Telegram API sendPhoto failed ${res.status}: ${text}`);
  }
  const json = await res.json();
  return (json.result as { message_id: number })?.message_id ?? 0;
}

/**
 * Send 2–10 photos as a media group (album) via multipart/form-data.
 * The caption is applied to the first photo only. Returns the first message_id.
 * Photos flow straight to Telegram — never written to disk.
 */
export async function sendMediaGroup(
  chatId: number,
  photos: { data: Blob; filename: string }[],
  caption: string,
  replyToMessageId?: number,
): Promise<number> {
  // Build the media JSON: caption on the first item only.
  const media = photos.map((p, i) => ({
    type: 'photo' as const,
    media: `attach://photo${i}`,
    ...(i === 0 ? { caption, parse_mode: 'HTML' } : {}),
  }));

  const fd = new FormData();
  fd.append('chat_id', String(chatId));
  fd.append('media', JSON.stringify(media));
  photos.forEach((p, i) => fd.append(`photo${i}`, p.data, p.filename));
  if (replyToMessageId) {
    fd.append('reply_parameters', JSON.stringify({ message_id: replyToMessageId }));
  }

  const res = await fetch(`${base()}/sendMediaGroup`, { method: 'POST', body: fd });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Telegram API sendMediaGroup failed ${res.status}: ${text}`);
  }
  const json = await res.json();
  // sendMediaGroup returns an array of Message objects — take the first.
  const results = json.result as Array<{ message_id: number }> | undefined;
  return results?.[0]?.message_id ?? 0;
}
