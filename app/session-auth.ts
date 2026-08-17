import { and, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "../db";
import { accounts, authSessions, profiles } from "../db/schema";
import { createSessionToken, hashSessionToken } from "./password-security";

export const SESSION_COOKIE = "yuri_session";
const SESSION_DAYS = 14;

export async function getSessionUser() {
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
