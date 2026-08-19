import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { subscriptions } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { syncSubscriptionByLocalId } from "../../../mercadopago-subscriptions";
import { syncOneTimeSubscriptionByLocalId } from "../../../subscription-one-time";

export const dynamic = "force-dynamic";
export const runtime = "edge";

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

  // Percorremos as tentativas mais recentes para recuperar tanto a assinatura
  // recorrente quanto a compra única de 30 dias após o retorno do Mercado Pago.
  for (const item of rows.slice(0, 8)) {
    const oneTime = await syncOneTimeSubscriptionByLocalId(item.id);
    if (oneTime.ok) {
      syncedStatus = oneTime.status;
      syncedSubscriptionId = oneTime.subscriptionId;
      syncedMode = "one_time";
      if (oneTime.previousStatus !== oneTime.status) changed = true;
      break;
    }

    const recurring = await syncSubscriptionByLocalId(item.id);
    if (!recurring.ok) continue;
    syncedStatus = recurring.status;
    syncedSubscriptionId = recurring.subscriptionId;
    syncedMode = "recurring";
    if (recurring.previousStatus !== recurring.status) changed = true;
    break;
  }

  return Response.json(
    { ok: true, changed, status: syncedStatus, subscriptionId: syncedSubscriptionId, mode: syncedMode },
    { headers: { "cache-control": "no-store" } },
  );
}
