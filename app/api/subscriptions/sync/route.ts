import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { subscriptions } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { syncSubscriptionByLocalId } from "../../../mercadopago-subscriptions";

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

  // Normalmente só existe uma tentativa atual, mas percorremos algumas recentes
  // para recuperar também retornos de checkout sem depender exclusivamente do webhook.
  for (const item of rows.slice(0, 5)) {
    const result = await syncSubscriptionByLocalId(item.id);
    if (!result.ok) continue;
    syncedStatus = result.status;
    syncedSubscriptionId = result.subscriptionId;
    if (result.previousStatus !== result.status) changed = true;
    break;
  }

  return Response.json(
    { ok: true, changed, status: syncedStatus, subscriptionId: syncedSubscriptionId },
    { headers: { "cache-control": "no-store" } },
  );
}
