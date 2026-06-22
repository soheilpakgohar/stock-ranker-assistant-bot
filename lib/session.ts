import { Redis } from '@upstash/redis';

export interface Session {
  step: number;
  answers: Record<string, string>;
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const key = (chatId: number) => `session:${chatId}`;

export async function getSession(chatId: number): Promise<Session | null> {
  return redis.get<Session>(key(chatId));
}

export async function saveSession(chatId: number, session: Session, ttlSeconds = 3600): Promise<void> {
  await redis.set(key(chatId), session, { ex: ttlSeconds });
}

export async function deleteSession(chatId: number): Promise<void> {
  await redis.del(key(chatId));
}
