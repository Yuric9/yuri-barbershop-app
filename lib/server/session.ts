/**
 * Sessões de login guardadas no banco.
 *
 * O navegador recebe um token aleatório em um cookie `httpOnly`; o banco
 * guarda apenas o hash desse token. Assim, um vazamento do banco não permite
 * reutilizar sessões.
 */
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { getDb } from "../../db";
import { accounts, authSessions, collaborators, profiles } from "../../db/schema";
import { createSessionToken, hashSessionToken } from "./passwords";

export const SESSION_COOKIE = "yuri_session";
const SESSION_DAYS = 14;

export type SessionUser = {
  email: string;
  name: string;
  role: string;
};

/** Rejeita sessões usadas a partir de outro site (proteção contra CSRF). */
async function isCrossSiteRequest() {
  const requestHeaders = await headers();
  const fetchSite = requestHeaders.get("sec-fetch-site");
  if (fetchSite === "cross-site") return true;
  if (fetchSite === "same-origin") return false;

  const origin = requestHeaders.get("origin");
  if (!origin) return false;
  const hosts = [requestHeaders.get("x-forwarded-host"), requestHeaders.get("host")]
    .filter(Boolean)
    .flatMap((value) => String(value).split(",").map((item) => item.trim()));
  try {
    return hosts.length > 0 && !hosts.includes(new URL(origin).host);
  } catch {
    return true;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (await isCrossSiteRequest()) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await getDb()
    .select({ email: accounts.email, role: accounts.role, active: accounts.active, name: profiles.name, collaboratorName: collaborators.name })
    .from(authSessions)
    .innerJoin(accounts, eq(accounts.email, authSessions.accountEmail))
    .leftJoin(profiles, eq(profiles.email, accounts.email))
    .leftJoin(collaborators, eq(collaborators.email, accounts.email))
    .where(and(eq(authSessions.tokenHash, await hashSessionToken(token)), gt(authSessions.expiresAt, new Date().toISOString())))
    .limit(1);
  const account = rows[0];
  if (!account?.active) return null;
  return { email: account.email, name: account.name || account.collaboratorName || account.email, role: account.role };
}

export async function startSession(email: string, secure: boolean) {
  const token = createSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 86_400_000);
  const db = getDb();
  await db.delete(authSessions).where(lt(authSessions.expiresAt, now.toISOString()));
  await db.insert(authSessions).values({
    tokenHash: await hashSessionToken(token),
    accountEmail: email,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure, sameSite: "lax", path: "/", expires: expiresAt });
}

export async function endSession(secure: boolean) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await getDb().delete(authSessions).where(eq(authSessions.tokenHash, await hashSessionToken(token)));
  store.set(SESSION_COOKIE, "", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
}
