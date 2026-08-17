import { and, eq, gt, lt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { getDb } from "../db";
import { accounts, authSessions, profiles } from "../db/schema";
import { createSessionToken, hashSessionToken } from "./password-security";

export const SESSION_COOKIE = "yuri_session";
const SESSION_DAYS = 14;

async function isCrossSiteSessionRequest() {
  const requestHeaders = await headers();
  if (requestHeaders.get("sec-fetch-site") === "cross-site") return true;

  const origin = requestHeaders.get("origin");
  if (!origin) return false;
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  if (!host) return false;

  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export async function getSessionUser() {
  if (await isCrossSiteSessionRequest()) return null;

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = await hashSessionToken(token);
  const now = new Date().toISOString();
  const db = getDb();
  const rows = await db.select({ email: accounts.email, role: accounts.role, active: accounts.active, name: profiles.name })
    .from(authSessions)
    .innerJoin(accounts, eq(accounts.email, authSessions.accountEmail))
    .leftJoin(profiles, eq(profiles.email, accounts.email))
    .where(and(eq(authSessions.tokenHash, tokenHash), gt(authSessions.expiresAt, now)))
    .limit(1);
  const account = rows[0];
  if (!account?.active) return null;
  return { email: account.email, fullName: account.name || null, displayName: account.name || account.email, role: account.role };
}

export async function createSession(email: string) {
  const token = createSessionToken();
  const tokenHash = await hashSessionToken(token);
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + SESSION_DAYS * 86400000);
  const db = getDb();
  await db.delete(authSessions).where(lt(authSessions.expiresAt, createdAt.toISOString()));
  await db.insert(authSessions).values({ tokenHash, accountEmail: email, createdAt: createdAt.toISOString(), expiresAt: expiresAt.toISOString() });
  return { token, expiresAt };
}

export async function deleteSession(token?: string) {
  if (!token) return;
  await getDb().delete(authSessions).where(eq(authSessions.tokenHash, await hashSessionToken(token)));
}
