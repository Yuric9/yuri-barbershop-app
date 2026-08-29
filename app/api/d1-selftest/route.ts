import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { accounts, authSessions, profiles } from "../../../db/schema";
import { POST as registerPost } from "../auth/register/route";
import { POST as loginPost } from "../auth/login/route";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const db = getDb();
  const now = new Date().toISOString();
  const suffix = String(Date.now()).slice(-9);
  const quickEmail = `__selftest_quick_${suffix}@cadastro.local`;
  const quickPhone = `999${suffix}`;
  const loginEmail = `__selftest_login_${suffix}@cadastro.local`;
  const loginPhone = `998${suffix}`;
  const password = "TesteSeguro2026!";
  const origin = new URL(request.url).origin;

  const result: Record<string, unknown> = {
    quickCreate: false,
    quickVerify: false,
    register: false,
    login: false,
    cleanup: false,
  };

  try {
    await db.insert(profiles).values({
      email: quickEmail,
      name: "Cliente Teste Cadastro Rápido",
      phone: quickPhone,
      birthDate: "",
      loyaltyAdjustment: 0,
      loyaltyRewardsRedeemed: 0,
      loyaltyAdjustmentNote: "",
      loyaltyUpdatedAt: "",
      loyaltyUpdatedBy: "",
      createdAt: now,
    });
    result.quickCreate = true;

    const [quickRow] = await db.select().from(profiles).where(eq(profiles.email, quickEmail)).limit(1);
    result.quickVerify = Boolean(quickRow?.email === quickEmail && quickRow?.phone === quickPhone);

    const registerResponse = await registerPost(new Request(`${origin}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({
        name: "Cliente Teste Login",
        phone: loginPhone,
        email: loginEmail,
        password,
        birthDate: "",
        area: "client",
      }),
    }));
    result.register = registerResponse.ok;
    if (!registerResponse.ok) result.registerStatus = registerResponse.status;

    if (registerResponse.ok) {
      const loginResponse = await loginPost(new Request(`${origin}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json", origin },
        body: JSON.stringify({ email: loginEmail, password, area: "client" }),
      }));
      result.login = loginResponse.ok;
      if (!loginResponse.ok) result.loginStatus = loginResponse.status;
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  } finally {
    try {
      await db.delete(authSessions).where(eq(authSessions.accountEmail, loginEmail));
      await db.delete(accounts).where(eq(accounts.email, loginEmail));
      await db.delete(profiles).where(eq(profiles.email, loginEmail));
      await db.delete(profiles).where(eq(profiles.email, quickEmail));

      const [quickLeft] = await db.select().from(profiles).where(eq(profiles.email, quickEmail)).limit(1);
      const [loginLeft] = await db.select().from(profiles).where(eq(profiles.email, loginEmail)).limit(1);
      const [accountLeft] = await db.select().from(accounts).where(eq(accounts.email, loginEmail)).limit(1);
      result.cleanup = !quickLeft && !loginLeft && !accountLeft;
    } catch (cleanupError) {
      result.cleanupError = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
    }
  }

  return Response.json(result, { status: result.quickCreate && result.quickVerify && result.register && result.login && result.cleanup ? 200 : 500 });
}
