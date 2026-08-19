import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { subscriptions } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import {
  getPaymentLinkBySubscription,
  syncSubscriptionByLocalId,
} from "../../../mercadopago-subscriptions";
import {
  getOneTimePaymentBySubscription,
  syncOneTimeSubscriptionByLocalId,
} from "../../../subscription-one-time";

export const dynamic = "force-dynamic";
export const runtime = "edge";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function syncOneTimeWithShortRetry(subscriptionId: number) {
  const first = await syncOneTimeSubscriptionByLocalId(subscriptionId);
  if (first.ok || first.reason !== "payment_not_created_yet") return first;

  // O Checkout Pro pode redirecionar o cliente alguns instantes antes de o
  // pagamento aparecer na busca da API. Fazemos uma única tentativa curta para
  // reduzir o risco de o cliente voltar ao site ainda vendo "Aguardando pagamento".
  await wait(700);
  return syncOneTimeSubscriptionByLocalId(subscriptionId);
}

export async function POST() {
  const user = await getChatGPTUser();
  if (!user || user.role !== "client") {
    return Response.json({ error: "Entre como cliente para atualizar o Clube Yuri." }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.clientEmail, user.email))
    .orderBy(desc(subscriptions.id));

  let changed = false;
  let syncedStatus = "";
  let syncedSubscriptionId = 0;
  let syncedMode = "";

  // Identificamos primeiro qual tipo de pagamento pertence a cada registro. Assim,
  // um checkout de 30 dias nunca é confundido com uma assinatura recorrente antiga.
  for (const item of rows.slice(0, 8)) {
    const oneTimeState = await getOneTimePaymentBySubscription(item.id);
    if (oneTimeState) {
      syncedMode = "one_time";
      syncedSubscriptionId = item.id;
      const result = await syncOneTimeWithShortRetry(item.id);
      if (result.ok) {
        syncedStatus = result.status;
        if (result.previousStatus !== result.status) changed = true;
      } else {
        syncedStatus = item.status;
      }
      break;
    }

    const recurringState = await getPaymentLinkBySubscription(item.id);
    if (recurringState) {
      syncedMode = "recurring";
      syncedSubscriptionId = item.id;
      const result = await syncSubscriptionByLocalId(item.id);
      if (result.ok) {
        syncedStatus = result.status;
        if (result.previousStatus !== result.status) changed = true;
      } else {
        syncedStatus = item.status;
      }
      break;
    }
  }

  return Response.json(
    { ok: true, changed, status: syncedStatus, subscriptionId: syncedSubscriptionId, mode: syncedMode },
    { headers: { "cache-control": "no-store" } },
  );
}
