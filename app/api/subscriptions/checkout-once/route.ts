import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { subscriptions } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { mercadoPagoRequest } from "../../../mercadopago-subscriptions";
import { mercadoPagoRuntimeConfig } from "../../../runtime-config";
import {
  getOneTimePaymentBySubscription,
  oneTimeExternalReference,
  saveOneTimePayment,
} from "../../../subscription-one-time";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const CLUBE_YURI_PROD_APP_ID = "2549193741810118";
const CLUBE_YURI_PROD_SELLER_ID = "184990261";

function today() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";
  return year && month && day ? `${year}-${month}-${day}` : new Date().toISOString().slice(0, 10);
}

function tokenIdentity(accessToken: string) {
  const parts = accessToken.trim().split("-");
  if (parts.length < 4 || parts[0] !== "APP_USR") return { appId: "", sellerId: "" };
  return { appId: parts[1] || "", sellerId: parts[parts.length - 1] || "" };
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user || user.role !== "client") {
    return Response.json({ error: "Entre como cliente para comprar 30 dias do Clube Yuri." }, { status: 401 });
  }

  const { accessToken, testPayerEmail } = mercadoPagoRuntimeConfig();
  const identity = tokenIdentity(accessToken);
  if (testPayerEmail) {
    return Response.json({ error: "O pagamento único está disponível apenas no ambiente de produção." }, { status: 503 });
  }
  if (identity.appId !== CLUBE_YURI_PROD_APP_ID || identity.sellerId !== CLUBE_YURI_PROD_SELLER_ID) {
    return Response.json({ error: "O pagamento do Clube Yuri está temporariamente indisponível." }, { status: 503 });
  }

  const db = getDb();
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.clientEmail, user.email)).orderBy(desc(subscriptions.id));
  const active = rows.find((item) => item.status === "Ativa" && (!item.endDate || item.endDate >= today()));
  if (active) return Response.json({ error: "Seu Clube Yuri já está ativo." }, { status: 409 });

  for (const item of rows.slice(0, 8)) {
    if (item.status !== "Aguardando pagamento") continue;
    const stored = await getOneTimePaymentBySubscription(item.id);
    if (stored?.init_point && !["approved", "refunded", "charged_back", "cancelled", "canceled"].includes(String(stored.provider_status || "").toLowerCase())) {
      return Response.json({ ok: true, checkoutUrl: stored.init_point, subscriptionId: item.id, reused: true, mode: "one_time" });
    }
  }

  const [current] = await db.insert(subscriptions).values({
    clientEmail: user.email,
    clientName: user.displayName,
    status: "Aguardando pagamento",
    priceCents: 12000,
    createdAt: new Date().toISOString(),
  }).returning();

  const origin = new URL(request.url).origin;
  const payload = {
    items: [
      {
        id: "clube-yuri-30-dias",
        title: "Clube Yuri - 30 dias",
        description: "Acesso ao Clube Yuri por 30 dias, sem renovação automática.",
        quantity: 1,
        currency_id: "BRL",
        unit_price: current.priceCents / 100,
      },
    ],
    payer: { email: user.email },
    external_reference: oneTimeExternalReference(current.id),
    back_urls: {
      success: `${origin}/?clube_yuri=retorno&clube_pagamento=aprovado`,
      pending: `${origin}/?clube_yuri=retorno&clube_pagamento=pendente`,
      failure: `${origin}/?clube_yuri=retorno&clube_pagamento=falhou`,
    },
    auto_return: "approved",
    notification_url: `${origin}/api/webhooks/mercadopago`,
  };

  let response: Response;
  try {
    response = await mercadoPagoRequest("/checkout/preferences", { method: "POST", body: JSON.stringify(payload) });
  } catch {
    return Response.json({ error: "Não foi possível abrir o pagamento único agora." }, { status: 503 });
  }

  const data = await response.json().catch(() => ({})) as {
    id?: string;
    init_point?: string;
    collector_id?: number | string;
    message?: string;
    error?: string;
  };

  if (!response.ok || !data.id || !data.init_point) {
    await db.update(subscriptions).set({ status: "Cancelada" }).where(eq(subscriptions.id, current.id));
    return Response.json({ error: "Não foi possível abrir o checkout do Mercado Pago. Tente novamente." }, { status: 502 });
  }

  if (data.collector_id && String(data.collector_id) !== CLUBE_YURI_PROD_SELLER_ID) {
    await db.update(subscriptions).set({ status: "Cancelada" }).where(eq(subscriptions.id, current.id));
    return Response.json({ error: "O Mercado Pago não confirmou a conta recebedora correta." }, { status: 503 });
  }

  await saveOneTimePayment({
    subscriptionId: current.id,
    preferenceId: data.id,
    initPoint: data.init_point,
    providerStatus: "pending",
  });

  return Response.json({ ok: true, checkoutUrl: data.init_point, subscriptionId: current.id, mode: "one_time" });
}
