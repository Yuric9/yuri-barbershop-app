import { getChatGPTUser } from "../../../chatgpt-auth";
import { expirePendingSubscriptionsForClient } from "../../../subscription-pending-expiration";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export async function POST() {
  const user = await getChatGPTUser();
  if (!user || user.role !== "client") {
    return Response.json({ error: "Entre como cliente para atualizar o Clube Yuri." }, { status: 401 });
  }

  const result = await expirePendingSubscriptionsForClient(user.email, { force: true, latestOnly: true });
  return Response.json({
    ok: true,
    expired: result.expired > 0,
    expiredIds: result.expiredIds,
  }, { headers: { "cache-control": "no-store" } });
}
