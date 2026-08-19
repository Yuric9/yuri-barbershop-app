import { getChatGPTUser } from "../../../chatgpt-auth";
import { mercadoPagoRequest } from "../../../mercadopago-subscriptions";
import { mercadoPagoRuntimeConfig } from "../../../runtime-config";

export const dynamic = "force-dynamic";
export const runtime = "edge";

function tokenIdentity(accessToken: string) {
  const parts = accessToken.trim().split("-");
  if (parts.length < 4 || parts[0] !== "APP_USR") return { appId: "", sellerId: "" };
  return { appId: parts[1] || "", sellerId: parts[parts.length - 1] || "" };
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user || user.role !== "admin") {
    return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
  }

  const { accessToken, testPayerEmail } = mercadoPagoRuntimeConfig();
  const identity = tokenIdentity(accessToken);

  let apiUser: Record<string, unknown> = {};
  let latest: Record<string, unknown>[] = [];
  try {
    const userResponse = await mercadoPagoRequest("/users/me");
    if (userResponse.ok) {
      const api = await userResponse.json() as Record<string, unknown>;
      apiUser = {
        id: api.id,
        nickname: api.nickname,
        site_id: api.site_id,
        site_status: api.site_status,
      };
    }
  } catch {}

  if (testPayerEmail) {
    try {
      const searchResponse = await mercadoPagoRequest(`/preapproval/search?payer_email=${encodeURIComponent(testPayerEmail)}&limit=5`);
      if (searchResponse.ok) {
        const data = await searchResponse.json() as { results?: Array<Record<string, unknown>> };
        latest = (data.results || []).slice(0, 5).map((item) => ({
          id: item.id,
          application_id: item.application_id,
          collector_id: item.collector_id,
          payer_id: item.payer_id,
          payer_email: item.payer_email,
          status: item.status,
          date_created: item.date_created,
        }));
      }
    } catch {}
  }

  return Response.json({
    build: "mp-debug-2026-08-18-02",
    mode: testPayerEmail ? "test" : "production",
    token: identity,
    testPayerEmail: testPayerEmail || "",
    apiUser,
    latest,
  }, { headers: { "cache-control": "no-store" } });
}
