import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { subscriptions } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getPaymentLinkBySubscription } from "../../../mercadopago-subscriptions";
import { expirePendingSubscriptionsForClient, PENDING_ATTEMPT_TTL_MS } from "../../../subscription-pending-expiration";
import { getOneTimePaymentBySubscription } from "../../../subscription-one-time";

export const dynamic = "force-dynamic";
export const runtime = "edge";

function pendingExpiresAt(createdAt?: string | null) {
  if (!createdAt) return "";
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return "";
  return new Date(created + PENDING_ATTEMPT_TTL_MS).toISOString();
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user || user.role !== "client") {
    return Response.json({ error: "Entre como cliente para consultar o Clube Yuri." }, { status: 401 });
  }

  const expiration = await expirePendingSubscriptionsForClient(user.email);
  const rows = await getDb()
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.clientEmail, user.email))
    .orderBy(desc(subscriptions.id));

  for (const item of rows.slice(0, 8)) {
    if (!["Ativa", "Aguardando pagamento"].includes(item.status)) continue;
    const oneTime = await getOneTimePaymentBySubscription(item.id);
    if (oneTime) {
      return Response.json({
        ok: true,
        subscriptionId: item.id,
        status: item.status,
        mode: "one_time",
        providerStatus: oneTime.provider_status,
        expiredAttempt: false,
        pendingExpiresAt: item.status === "Aguardando pagamento" ? pendingExpiresAt(item.createdAt) : "",
      }, { headers: { "cache-control": "no-store" } });
    }
    const recurring = await getPaymentLinkBySubscription(item.id);
    if (recurring) {
      return Response.json({
        ok: true,
        subscriptionId: item.id,
        status: item.status,
        mode: "recurring",
        providerStatus: recurring.provider_status,
        expiredAttempt: false,
        pendingExpiresAt: item.status === "Aguardando pagamento" ? pendingExpiresAt(item.createdAt) : "",
      }, { headers: { "cache-control": "no-store" } });
    }
  }

  return Response.json({
    ok: true,
    subscriptionId: 0,
    status: "",
    mode: "",
    providerStatus: "",
    expiredAttempt: expiration.expired > 0,
    pendingExpiresAt: "",
  }, { headers: { "cache-control": "no-store" } });
}
