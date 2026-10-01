import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../../db";
import { accounts } from "../../../../db/schema";
import { ADMIN_ROLE } from "../../../../lib/server/auth";
import { ensureOwnerCollaborator } from "../../../../lib/server/collaborators";
import { hashPassword, needsRehash, verifyPassword } from "../../../../lib/server/passwords";
import { checkLoginLimit, clearLoginFailures, recordLoginFailure } from "../../../../lib/server/rate-limit";
import { rejectCrossSiteWrite } from "../../../../lib/server/request-security";
import { adminRuntimeConfig } from "../../../../lib/server/runtime-config";
import { startSession } from "../../../../lib/server/session";

export const dynamic = "force-dynamic";

const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(256),
});

const fail = (status: number, error: string) => Response.json({ error }, { status, headers: { "cache-control": "no-store" } });

export async function POST(request: Request) {
  const crossSite = rejectCrossSiteWrite(request);
  if (crossSite) return crossSite;

  const parsed = credentials.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "Informe e-mail e senha válidos.");
  const { email, password } = parsed.data;

  try {
    const limit = await checkLoginLimit(request, email);
    if (limit.blocked) return fail(429, "Muitas tentativas. Aguarde 15 minutos e tente novamente.");

    const db = getDb();
    const [account] = await db.select().from(accounts).where(eq(accounts.email, email)).limit(1);
    const admin = adminRuntimeConfig();
    const isConfiguredAdmin = Boolean(admin.email && admin.passwordHash && email === admin.email);

    // O administrador principal é definido pelos segredos do Worker
    // (ADMIN_EMAIL / ADMIN_PASSWORD_HASH). Outras contas administrativas
    // ficam na tabela `accounts`.
    let valid = false;
    if (isConfiguredAdmin) valid = await verifyPassword(password, admin.passwordHash);
    if (!valid && account?.active) valid = await verifyPassword(password, account.passwordHash);

    const role = isConfiguredAdmin && valid ? ADMIN_ROLE : account?.role;
    if (!valid || role !== ADMIN_ROLE) {
      await recordLoginFailure(limit.key);
      return fail(401, "E-mail ou senha incorretos.");
    }
    await clearLoginFailures(limit.key);

    const now = new Date().toISOString();
    if (!account) {
      await db.insert(accounts).values({ email, passwordHash: await hashPassword(password), role: ADMIN_ROLE, active: true, createdAt: now });
    } else if (account.role !== ADMIN_ROLE || !account.active || needsRehash(account.passwordHash)) {
      // Atualiza hashes antigos para o formato atual na primeira oportunidade.
      const passwordHash = needsRehash(account.passwordHash) ? await hashPassword(password) : account.passwordHash;
      await db.update(accounts).set({ role: ADMIN_ROLE, active: true, passwordHash }).where(eq(accounts.email, email));
    }

    // O administrador também atende: garante seu cadastro na equipe (e o nome exibido).
    await ensureOwnerCollaborator(db, { email, name: email, role: ADMIN_ROLE });
    await startSession(email, new URL(request.url).protocol === "https:");
    return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("auth-login-failure", error);
    return fail(500, "Não foi possível entrar agora. Tente novamente em instantes.");
  }
}
