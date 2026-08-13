import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "../../../../db";
import { accounts, profiles } from "../../../../db/schema";
import { hashPassword } from "../../../password-security";
import { createSession, SESSION_COOKIE } from "../../../session-auth";
import { adminRuntimeConfig } from "../../../runtime-config";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json() as Record<string, unknown>;
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").replace(/\D/g, "");
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (name.length < 2) return Response.json({ error: "Informe seu nome." }, { status: 400 });
  if (phone.length < 10 || phone.length > 13) return Response.json({ error: "Informe um telefone válido com DDD." }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
  if (email === adminRuntimeConfig().email) return Response.json({ error: "Este e-mail é reservado para a administração." }, { status: 403 });
  if (password.length < 8) return Response.json({ error: "A senha precisa ter pelo menos 8 caracteres." }, { status: 400 });
  const db = getDb();
  if ((await db.select({ email: accounts.email }).from(accounts).where(eq(accounts.email, email)).limit(1)).length) return Response.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
  const now = new Date().toISOString();
  await db.insert(accounts).values({ email, passwordHash: await hashPassword(password), role: "client", active: true, createdAt: now });
  await db.insert(profiles).values({ email, name, phone, birthDate: String(body.birthDate || ""), createdAt: now });
  const session = await createSession(email);
  (await cookies()).set(SESSION_COOKIE, session.token, { httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "lax", path: "/", expires: session.expiresAt });
  return Response.json({ ok: true });
}
