import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { accounts, authSessions, profiles } from "../../../db/schema";
import { POST as registerPost } from "../auth/register/route";
import { POST as loginPost } from "../auth/login/route";

export const dynamic = "force-dynamic";

function errorText(error: unknown) {
  const value = error as { message?: unknown; cause?: unknown };
  const message = typeof value?.message === "string" ? value.message : String(error);
  const cause = value?.cause;
  if (!cause) return message;
  const causeValue = cause as { message?: unknown };
  const causeMessage = typeof causeValue?.message === "string" ? causeValue.message : String(cause);
  return `${message} | cause: ${causeMessage}`;
}

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
    quickExtended: false,
    quickMinimal: false,
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
    result.quickExtended = true;
  } catch (error) {
    result.quickExtendedError = errorText(error);
  }

  try {
    await db.delete(profiles).where(eq(profiles.email, quickEmail));
    await db.insert(profiles).values({
      email: quickEmail,
      name: "Cliente Teste Cadastro Rápido",
      phone: quickPhone,
      birthDate: "",
      createdAt: now,
    });
    result.quickMinimal = true;
    const [row] = await db.select({ email: profiles.email, phone: profiles.phone }).from(profiles).where(eq(profiles.email, quickEmail)).limit(1);
    result.quickVerify = Boolean(row?.email === quickEmail && row?.phone === quickPhone);
  } catch (error) {
    result.quickMinimalError = errorText(error);
  }

  try {
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
    result.registerStatus = registerResponse.status;
    if (!registerResponse.ok) result.registerBody = (await registerResponse.text()).slice(0, 500);
  } catch (error) {
    result.registerError = errorText(error);
  }

  if (result.register === true) {
    try {
      const loginResponse = await loginPost(new Request(`${origin}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json", origin },
        body: JSON.stringify({ email: loginEmail, password, area: "client" }),
      }));
      result.login = loginResponse.ok;
      result.loginStatus = loginResponse.status;
      if (!loginResponse.ok) result.loginBody = (await loginResponse.text()).slice(0, 500);
    } catch (error) {
      result.loginError = errorText(error);
    }
  }

  try {
    await db.delete(authSessions).where(eq(authSessions.accountEmail, loginEmail));
    await db.delete(accounts).where(eq(accounts.email, loginEmail));
    await db.delete(profiles).where(eq(profiles.email, loginEmail));
    await db.delete(profiles).where(eq(profiles.email, quickEmail));

    const [quickLeft] = await db.select({ email: profiles.email }).from(profiles).where(eq(profiles.email, quickEmail)).limit(1);
    const [loginLeft] = await db.select({ email: profiles.email }).from(profiles).where(eq(profiles.email, loginEmail)).limit(1);
    const [accountLeft] = await db.select({ email: accounts.email }).from(accounts).where(eq(accounts.email, loginEmail)).limit(1);
    result.cleanup = !quickLeft && !loginLeft && !accountLeft;
  } catch (error) {
    result.cleanupError = errorText(error);
  }

  const passed = result.quickMinimal === true && result.quickVerify === true && result.register === true && result.login === true && result.cleanup === true;
  return Response.json(result, { status: passed ? 200 : 500 });
}
