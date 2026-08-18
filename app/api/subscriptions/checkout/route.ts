import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { subscriptions } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import {
  getPaymentLinkBySubscription,
  mercadoPagoRequest,
  runOneTimeSubscriptionTestReset,
  savePaymentLink,
  syncLocalSubscriptionFromMercadoPago,
  type MercadoPagoPreapproval,
} from "../../../mercadopago-subscriptions";
import { mercadoPagoRuntimeConfig } from "../../../runtime-config";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const CLUBE_YURI_TEST_APP_ID = "8874721750108093";
const CLUBE_YURI_TEST_SELLER_ID = "3625511764";
const CLUBE_YURI_TEST_PUBLIC_KEY = "APP_USR-09006eaf-14fa-4961-b1ac-e01d5cd3db92";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function tokenIdentity(accessToken: string) {
  const parts = accessToken.trim().split("-");
  if (parts.length < 4 || parts[0] !== "APP_USR") return { appId: "", sellerId: "" };
  return {
    appId: parts[1] || "",
    sellerId: parts[parts.length - 1] || "",
  };
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user || user.role !== "client") {
    return Response.json({ error: "Entre como cliente para assinar o Clube Yuri." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { cardTokenId?: string };
  const cardTokenId = String(body.cardTokenId || "").trim();

  await runOneTimeSubscriptionTestReset();

  const db = getDb();
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.clientEmail, user.email))
    .orderBy(desc(subscriptions.id));

  const active = rows.find((item) => item.status === "Ativa" && (!item.endDate || item.endDate >= today()));
  if (active) return Response.json({ error: "Seu Clube Yuri já está ativo." }, { status: 409 });

  let current = rows.find((item) => item.status === "Aguardando pagamento");
  if (!current) {
    const [created] = await db
      .insert(subscriptions)
      .values({ clientEmail: user.email, clientName: user.displayName, createdAt: new Date().toISOString() })
      .returning();
    current = created;
  }

  const { testPayerEmail, accessToken } = mercadoPagoRuntimeConfig();

  if (testPayerEmail) {
    const identity = tokenIdentity(accessToken);
    if (identity.appId !== CLUBE_YURI_TEST_APP_ID || identity.sellerId !== CLUBE_YURI_TEST_SELLER_ID) {
      return Response.json(
        {
          error: `Credencial de teste ainda não está ativa no servidor. Aplicação em uso: ${identity.appId || "não identificada"}; vendedor em uso: ${identity.sellerId || "não identificado"}.`,
        },
        { status: 503 },
      );
    }

    // O checkout hospedado do Mercado Pago estava misturando a sessão do navegador
    // com o ambiente de teste. Em teste usamos o fluxo oficial de CardToken +
    // preapproval authorized, que não depende de login/sessão no checkout hospedado.
    if (!cardTokenId) {
      return Response.json({
        ok: true,
        testMode: true,
        publicKey: CLUBE_YURI_TEST_PUBLIC_KEY,
        amount: current.priceCents / 100,
        payerEmail: testPayerEmail,
        subscriptionId: current.id,
      });
    }
  }

  const existingPayment = await getPaymentLinkBySubscription(current.id);
  if (!testPayerEmail && existingPayment?.init_point && ["pending", "authorized"].includes(existingPayment.provider_status)) {
    return Response.json({
      ok: true,
      checkoutUrl: existingPayment.init_point,
      subscriptionId: current.id,
      reused: true,
    });
  }

  const origin = new URL(request.url).origin;
  const mercadoPagoPayerEmail = testPayerEmail || user.email;
  const payload: Record<string, unknown> = {
    reason: "Clube Yuri - Yuri Barbershop",
    external_reference: `clube-yuri:${current.id}`,
    payer_email: mercadoPagoPayerEmail,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: current.priceCents / 100,
      currency_id: "BRL",
    },
    back_url: `${origin}/?clube_yuri=retorno`,
    status: testPayerEmail ? "authorized" : "pending",
  };

  if (testPayerEmail && cardTokenId) payload.card_token_id = cardTokenId;

  let response: Response;
  try {
    response = await mercadoPagoRequest("/preapproval", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    return Response.json({ error: "O pagamento do Clube Yuri ainda não está disponível." }, { status: 503 });
  }

  const data = (await response.json().catch(() => ({}))) as MercadoPagoPreapproval & {
    application_id?: number | string;
    collector_id?: number | string;
    payer_id?: number | string;
    message?: string;
    error?: string;
    cause?: Array<{ code?: number | string; description?: string }>;
  };

  if (!response.ok || !data.id || (!testPayerEmail && !data.init_point)) {
    const providerDetail = [data.message, data.error, data.cause?.[0]?.description].filter(Boolean).join(" — ");
    const error = testPayerEmail && providerDetail
      ? `Mercado Pago (teste): ${providerDetail}`
      : "Não foi possível abrir o pagamento agora. Tente novamente em instantes.";
    return Response.json(
      { error },
      { status: response.status >= 400 && response.status < 500 ? 400 : 502 },
    );
  }

  if (testPayerEmail) {
    const returnedAppId = String(data.application_id || "");
    const returnedSellerId = String(data.collector_id || "");
    if (returnedAppId !== CLUBE_YURI_TEST_APP_ID || returnedSellerId !== CLUBE_YURI_TEST_SELLER_ID) {
      return Response.json(
        {
          error: `Mercado Pago criou a assinatura com a conta errada. Aplicação retornada: ${returnedAppId || "não informada"}; vendedor retornado: ${returnedSellerId || "não informado"}.`,
        },
        { status: 503 },
      );
    }
  }

  await savePaymentLink({
    subscriptionId: current.id,
    mercadoPagoId: data.id,
    initPoint: data.init_point || "",
    providerStatus: data.status || "pending",
    nextPaymentDate: data.next_payment_date || "",
  });

  if (testPayerEmail) {
    const sync = await syncLocalSubscriptionFromMercadoPago(data);
    return Response.json({
      ok: true,
      testMode: true,
      authorized: String(data.status || "").toLowerCase() === "authorized",
      providerStatus: data.status || "",
      payerId: data.payer_id || null,
      subscriptionId: current.id,
      localStatus: sync.ok ? sync.status : "",
    });
  }

  return Response.json({ ok: true, checkoutUrl: data.init_point, subscriptionId: current.id });
}
