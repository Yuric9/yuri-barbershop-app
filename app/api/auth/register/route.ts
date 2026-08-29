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

function normalizePhone(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

export async function POST(request: Request) {
  const originError = rejectCrossSiteWrite(request);
  if (originError) return originError;

  if (await consumeRegistrationLimit(request)) {
    return Response.json({ error: "Muitos cadastros realizados desta conexão. Aguarde 15 minutos e tente novamente." }, { status: 429 });
  }

  const body = await request.json() as Record<string, unknown>;
  const name = String(body.name || "").trim();
  const phone = normalizePhone(body.phone);
  const informedEmail = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const birthDate = String(body.birthDate || "").trim();

  if (name.length < 2 || name.length > 120) return Response.json({ error: "Informe um nome válido." }, { status: 400 });
  if (phone.length < 8 || phone.length > 13) return Response.json({ error: "Informe um telefone válido." }, { status: 400 });
  if (informedEmail && (informedEmail.length > 254 || !/^\S+@\S+\.\S+$/.test(informedEmail))) return Response.json({ error: "Informe um e-mail válido ou deixe o campo em branco." }, { status: 400 });
  if (informedEmail === adminRuntimeConfig().email) return Response.json({ error: "Este e-mail é reservado para a administração." }, { status: 403 });
  if (password.length < 8 || password.length > 256) return Response.json({ error: "A senha deve ter entre 8 e 256 caracteres." }, { status: 400 });
  if (birthDate.length > 10) return Response.json({ error: "Data de nascimento inválida." }, { status: 400 });

  const db = getDb();
  const profileRows = await db.select().from(profiles);
  const profileByPhone = profileRows.find((profile) => normalizePhone(profile.phone) === phone);
  const profileByEmail = informedEmail ? profileRows.find((profile) => profile.email === informedEmail) : undefined;

  if (profileByEmail && normalizePhone(profileByEmail.phone) && normalizePhone(profileByEmail.phone) !== phone) {
    return Response.json({ error: "Este e-mail já está vinculado a outro cliente." }, { status: 409 });
  }

  const existingProfile = profileByPhone || profileByEmail;
  const accountEmail = existingProfile?.email || informedEmail || `cliente-${phone}@cadastro.local`;

  if ((await db.select({ email: accounts.email }).from(accounts).where(eq(accounts.email, accountEmail)).limit(1)).length) {
    return Response.json({ error: "Este telefone já possui acesso. Entre com seu telefone e senha." }, { status: 409 });
  }

  const now = new Date().toISOString();
  if (existingProfile) {
    await db.update(profiles).set({
      name,
      phone,
      birthDate: birthDate || existingProfile.birthDate || "",
    }).where(eq(profiles.email, existingProfile.email));
  } else {
    await db.insert(profiles).values({
      email: accountEmail,
      name,
      phone,
      birthDate,
      loyaltyAdjustment: 0,
      loyaltyRewardsRedeemed: 0,
      loyaltyAdjustmentNote: "",
      loyaltyUpdatedAt: "",
      loyaltyUpdatedBy: "",
      createdAt: now,
    });
  }

  await db.insert(accounts).values({
    email: accountEmail,
    passwordHash: await hashPassword(password),
    role: "client",
    active: true,
    createdAt: now,
  });

  const session = await createSession(accountEmail);
  (await cookies()).set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });
  return Response.json({ ok: true });
}
