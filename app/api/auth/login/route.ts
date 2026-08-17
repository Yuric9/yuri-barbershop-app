import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "../../../../db";
import { accounts } from "../../../../db/schema";
import { verifyPassword } from "../../../password-security";
import { adminRuntimeConfig } from "../../../runtime-config";
import { checkLoginLimit, clearLoginFailures, recordLoginFailure } from "../../../auth-rate-limit";
import { createSession, SESSION_COOKIE } from "../../../session-auth";
import { rejectCrossSiteWrite } from "../../../request-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
 let stage = "entrada";
 try {
  const originError = rejectCrossSiteWrite(request);
  if (originError) return originError;

  const body = await request.json() as Record<string, unknown>;
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const requestedArea = body.area === "admin" ? "admin" : "client";
  if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email) || !password || password.length > 256) {
    return Response.json({ error: "Informe e-mail e senha válidos." }, { status: 400 });
  }

  stage = "proteção de acesso";
  const loginLimit = await checkLoginLimit(request, email);
  if (loginLimit.blocked) {
    return Response.json({ error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." }, { status: 429 });
  }

  stage = "consulta da conta";
  const db = getDb();
  const [account] = await db.select().from(accounts).where(eq(accounts.email, email)).limit(1);
  const admin = adminRuntimeConfig();
  const isRuntimeAdmin = email === admin.email && Boolean(admin.passwordHash);

  let valid = false;
  let role = account?.role || "client";

  if (isRuntimeAdmin) {
    stage = "validação da senha administrativa";
    valid = await verifyPassword(password, admin.passwordHash);
    if (!valid && account?.active && account.passwordHash !== admin.passwordHash) {
      valid = await verifyPassword(password, account.passwordHash);
    }
    if (valid) {
      role = "admin";
      stage = "sincronização da conta administrativa";
      if (!account) {
        await db.insert(accounts).values({
          email,
          passwordHash: admin.passwordHash,
          role: "admin",
          active: true,
          createdAt: new Date().toISOString(),
        });
      } else if (account.role !== "admin" || !account.active || account.passwordHash !== admin.passwordHash) {
        await db.update(accounts)
          .set({ passwordHash: admin.passwordHash, role: "admin", active: true })
          .where(eq(accounts.email, email));
      }
    }
  } else {
    stage = "validação da senha";
    valid = Boolean(account?.active && await verifyPassword(password, account.passwordHash));
  }

  if (!valid) {
    await recordLoginFailure(loginLimit.key);
    return Response.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  }
  await clearLoginFailures(loginLimit.key);
  if (requestedArea === "admin" && role !== "admin") return Response.json({ error: "Este usuário não possui acesso administrativo." }, { status: 403 });

  stage = "criação da sessão";
  const session = await createSession(email);
  stage = "gravação do cookie";
  (await cookies()).set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });
  return Response.json({ ok: true, role });
 } catch (error) {
  console.error("auth-login-failure", stage, error);
  return Response.json({ error: "Não foi possível entrar agora. Tente novamente em instantes." }, { status: 500 });
 }
}
