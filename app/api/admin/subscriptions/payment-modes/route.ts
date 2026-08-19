import { getChatGPTUser } from "../../../../chatgpt-auth";
import { ensureSubscriptionPaymentStore } from "../../../../mercadopago-subscriptions";
import { ensureOneTimePaymentStore } from "../../../../subscription-one-time";

export const dynamic = "force-dynamic";
export const runtime = "edge";

function d1() {
  return (globalThis as typeof globalThis & { __YURI_DB?: D1Database }).__YURI_DB;
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Acesso restrito ao administrador" }, { status: 403 });
  }

  const binding = d1();
  if (!binding) return Response.json({ ok: true, modes: {} });

  try {
    await Promise.all([ensureSubscriptionPaymentStore(), ensureOneTimePaymentStore()]);
    const [recurring, oneTime] = await Promise.all([
      binding.prepare("SELECT subscription_id FROM subscription_payments").all<{ subscription_id: number }>(),
      binding.prepare("SELECT subscription_id FROM subscription_one_time_payments").all<{ subscription_id: number }>(),
    ]);

    const modes: Record<string, "recurring" | "one_time"> = {};
    for (const row of recurring.results || []) modes[String(row.subscription_id)] = "recurring";
    for (const row of oneTime.results || []) modes[String(row.subscription_id)] = "one_time";
    return Response.json({ ok: true, modes }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: true, modes: {} }, { headers: { "cache-control": "no-store" } });
  }
}
