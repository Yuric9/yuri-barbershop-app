import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "../../../../db";
import { accounts, profiles } from "../../../../db/schema";
import { hashPassword } from "../../../password-security";
import { createSession, SESSION_COOKIE } from "../../../session-auth";
import { adminRuntimeConfig } from "../../../runtime-config";
import { consumeRegistrationLimit } from "../../../auth-rate-limit";
import { rejectCrossSiteWrite } from "../../../request-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const originError = rejectCrossSiteWrite(request);
  if (originError) return originError;

  if (await consumeRegistrationLimit(request)) {
    return Response.json({ error: "Muitos cadastros realizados desta conexão. Aguarde 15 minutos e tente novamente." }, { status: 429 });
  }

  const body = await request.json() as Record<string, unknown>;
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").replace(/\D/g, "");
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const birthDate = String(body.birthDate || "").trim();

  if (name.length < 2 || name.length > 120) return Response.json({ error: "Informe um nome válido." }, { status: 400 });
  if (phone.length < 10 || phone.length > 13) return Response.json({ error: "Informe um telefone válido com DDD." }, { status: 400 });
  if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
  if (email === adminRuntimeConfig().email) return Response.json({ error: "Este e-mail é reservado para a administração." }, { status: 403 });
  if (password.length < 8 || password.length > 256) return Response.json({ error: "A senha deve ter entre 8 e 256 caracteres." }, { status: 400 });
  if (birthDate.length > 10) return Response.json({ error: "Data de nascimento inválida." }, { status: 400 });

  const db = getDb();
  if ((await db.select({ email: accounts.email }).from(accounts).where(eq(accounts.email, email)).limit(1)).length) return Response.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
  const existingProfiles = await db.select({ email: profiles.email, phone: profiles.phone }).from(profiles);
  if (existingProfiles.some((profile) => profile.email !== email && String(profile.phone || "").replace(/\D/g, "") === phone)) return Response.json({ error: "Este telefone já está cadastrado." }, { status: 409 });
  const now = new Date().toISOString();
  await db.insert(accounts).values({ email, passwordHash: await hashPassword(password), role: "client", active: true, createdAt: now });
  await db.insert(profiles).values({ email, name, phone, birthDate, createdAt: now });
  const session = await createSession(email);
  (await cookies()).set(SESSION_COOKIE, session.token, { httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "lax", path: "/", expires: session.expiresAt });
  return Response.json({ ok: true });
}
