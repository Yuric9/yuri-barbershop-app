import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { subscriptions } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import {
  getPaymentLinkBySubscription,
  mercadoPagoRequest,
  runOneTimeSubscriptionTestReset,
  savePaymentLink,
  type MercadoPagoPreapproval,
} from "../../../mercadopago-subscriptions";

export const dynamic = "force-dynamic";
export const runtime = "edge";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user || user.role !== "client") {
    return Response.json({ error: "Entre como cliente para assinar o Clube Yuri." }, { status: 401 });
  }

  // Limpeza controlada para reiniciar o teste do Clube Yuri do zero.
  // Executa apenas uma vez: cancela solicitações ainda pendentes e remove
  // vínculos antigos de checkout, preservando assinaturas já ativas.
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

  const existingPayment = await getPaymentLinkBySubscription(current.id);
  if (existingPayment?.init_point && ["pending", "authorized"].includes(existingPayment.provider_status)) {
    return Response.json({
      ok: true,
      checkoutUrl: existingPayment.init_point,
      subscriptionId: current.id,
      reused: true,
    });
  }

  const origin = new URL(request.url).origin;
  // Em testes do Mercado Pago, o pagador também precisa ser um usuário de teste.
  // O e-mail real do cliente continua salvo no nosso banco; apenas o payer_email
  // enviado ao Mercado Pago pode ser substituído por MP_TEST_PAYER_EMAIL.
  const mercadoPagoPayerEmail = process.env.MP_TEST_PAYER_EMAIL?.trim() || user.email;
  const payload = {
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
    status: "pending",
  };

  let response: Response;
  try {
    response = await mercadoPagoRequest("/preapproval", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    return Response.json({ error: "O pagamento do Clube Yuri ainda não está disponível." }, { status: 503 });
  }

  const data = (await response.json().catch(() => ({}))) as MercadoPagoPreapproval & { message?: string };
  if (!response.ok || !data.id || !data.init_point) {
    return Response.json(
      { error: "Não foi possível abrir o pagamento agora. Tente novamente em instantes." },
      { status: response.status >= 400 && response.status < 500 ? 400 : 502 },
    );
  }

  await savePaymentLink({
    subscriptionId: current.id,
    mercadoPagoId: data.id,
    initPoint: data.init_point,
    providerStatus: data.status || "pending",
    nextPaymentDate: data.next_payment_date || "",
  });

  return Response.json({ ok: true, checkoutUrl: data.init_point, subscriptionId: current.id });
}
