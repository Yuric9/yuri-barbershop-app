import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "../../../../db";
import { accounts } from "../../../../db/schema";
import { verifyPassword } from "../../../password-security";
import { adminRuntimeConfig } from "../../../runtime-config";
import { createSession, SESSION_COOKIE } from "../../../session-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
 let stage = "entrada";
 try {
  const body = await request.json() as Record<string, unknown>;
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const requestedArea = body.area === "admin" ? "admin" : "client";
  if (!/^\S+@\S+\.\S+$/.test(email) || !password) return Response.json({ error: "Informe e-mail e senha." }, { status: 400 });

  stage = "consulta da conta";
  const db = getDb();
  const [account] = await db.select().from(accounts).where(eq(accounts.email, email)).limit(1);
  const admin = adminRuntimeConfig();
  const isRuntimeAdmin = email === admin.email && Boolean(admin.passwordHash);

  let valid = false;
  let role = account?.role || "client";

  if (isRuntimeAdmin) {
    // O segredo da Cloudflare é a fonte oficial do acesso administrativo.
    // Validá-lo primeiro evita que um hash antigo salvo no D1 bloqueie o login.
    stage = "validação da senha administrativa";
    valid = await verifyPassword(password, admin.passwordHash);
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

  if (!valid) return Response.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
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
  return Response.json({ error: `Falha na etapa: ${stage}.` }, { status: 500 });
 }
}
