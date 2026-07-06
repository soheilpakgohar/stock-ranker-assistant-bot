import { createHmac } from 'crypto';

export type TelegramUser = { id: number; firstName: string; username?: string };

/**
 * Validate Telegram WebApp `initData` using the standard "WebAppData"
 * HMAC-SHA256 algorithm keyed by the bot token.
 *
 * Empty `initData` is allowed (browser access — no user info will be
 * available); only non-empty-but-invalid data is rejected.
 */
export function validateInitData(initData: string, token: string): boolean {
  if (!initData) return true;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return false;
    params.delete('hash');
    const checkStr = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    const secret = createHmac('sha256', 'WebAppData').update(token).digest();
    return createHmac('sha256', secret).update(checkStr).digest('hex') === hash;
  } catch {
    return false;
  }
}

/** Extract `{ id, firstName, username }` from the `user` param in `initData`. */
export function parseUser(initData: string): TelegramUser | null {
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    if (!userStr) return null;
    const u = JSON.parse(userStr);
    return { id: u.id, firstName: u.first_name ?? 'کاربر', username: u.username };
  } catch {
    return null;
  }
}
