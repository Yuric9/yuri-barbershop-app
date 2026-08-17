import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { authAttempts } from "../db/schema";

const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;
const MAX_REGISTRATIONS = 5;

async function attemptKey(request: Request, scope: string, identity: string) {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const raw = `${scope}|${ip}|${identity.trim().toLowerCase()}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function incrementAttempt(key: string, maxAttempts: number) {
  const db = getDb();
  const [row] = await db.select().from(authAttempts).where(eq(authAttempts.key, key)).limit(1);
  const now = Date.now();
  if (row?.blockedUntil && Date.parse(row.blockedUntil) > now) return true;

  const windowStart = row ? Date.parse(row.windowStart) : 0;
  const withinWindow = Number.isFinite(windowStart) && now - windowStart < WINDOW_MS;
  const nextCount = withinWindow ? row.count + 1 : 1;
  const nextWindow = withinWindow ? row.windowStart : new Date(now).toISOString();
  const blockedUntil = nextCount >= maxAttempts ? new Date(now + BLOCK_MS).toISOString() : "";

  await db.insert(authAttempts).values({
    key,
    count: nextCount,
    windowStart: nextWindow,
    blockedUntil,
  }).onConflictDoUpdate({
    target: authAttempts.key,
    set: { count: nextCount, windowStart: nextWindow, blockedUntil },
  });
  return false;
}

export async function checkLoginLimit(request: Request, identity: string) {
  const key = await attemptKey(request, "login", identity);
  const db = getDb();
  const [row] = await db.select().from(authAttempts).where(eq(authAttempts.key, key)).limit(1);
  const now = Date.now();
  const blocked = Boolean(row?.blockedUntil && Date.parse(row.blockedUntil) > now);
  return { key, blocked };
}

export async function recordLoginFailure(key: string) {
  await incrementAttempt(key, MAX_FAILURES);
}

export async function clearLoginFailures(key: string) {
  await getDb().delete(authAttempts).where(eq(authAttempts.key, key));
}

export async function consumeRegistrationLimit(request: Request) {
  const key = await attemptKey(request, "register", "public");
  return incrementAttempt(key, MAX_REGISTRATIONS);
}
