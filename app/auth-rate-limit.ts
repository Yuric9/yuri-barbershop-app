import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { authAttempts } from "../db/schema";

const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

async function attemptKey(request: Request, identity: string) {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const raw = `login|${ip}|${identity.trim().toLowerCase()}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function checkLoginLimit(request: Request, identity: string) {
  const key = await attemptKey(request, identity);
  const db = getDb();
  const [row] = await db.select().from(authAttempts).where(eq(authAttempts.key, key)).limit(1);
  const now = Date.now();
  const blocked = Boolean(row?.blockedUntil && Date.parse(row.blockedUntil) > now);
  return { key, blocked };
}

export async function recordLoginFailure(key: string) {
  const db = getDb();
  const [row] = await db.select().from(authAttempts).where(eq(authAttempts.key, key)).limit(1);
  const now = Date.now();
  const windowStart = row ? Date.parse(row.windowStart) : 0;
  const withinWindow = Number.isFinite(windowStart) && now - windowStart < WINDOW_MS;
  const nextCount = withinWindow ? row.count + 1 : 1;
  const nextWindow = withinWindow ? row.windowStart : new Date(now).toISOString();
  const blockedUntil = nextCount >= MAX_FAILURES ? new Date(now + BLOCK_MS).toISOString() : "";
  await db.insert(authAttempts).values({
    key,
    count: nextCount,
    windowStart: nextWindow,
    blockedUntil,
  }).onConflictDoUpdate({
    target: authAttempts.key,
    set: { count: nextCount, windowStart: nextWindow, blockedUntil },
  });
}

export async function clearLoginFailures(key: string) {
  await getDb().delete(authAttempts).where(eq(authAttempts.key, key));
}
