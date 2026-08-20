import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { subscriptions } from "../db/schema";
import { mercadoPagoRequest } from "./mercadopago-subscriptions";

const BUSINESS_TIME_ZONE = "America/Sao_Paulo";
const CLUBE_YURI_PROD_SELLER_ID = "184990261";

export type MercadoPagoOneTimePayment = {
  id?: number | string;
  status?: string;
  external_reference?: string | null;
  transaction_amount?: number | string;
  currency_id?: string;
  collector_id?: number | string;
  date_created?: string | null;
  date_approved?: string | null;
  payer?: { email?: string | null } | null;
};

type OneTimePaymentRow = {
  subscription_id: number;
  preference_id: string;
  init_point: string;
  payment_id: string;
  provider_status: string;
  created_at: string;
  updated_at: string;
};

function d1() {
  const binding = (globalThis as typeof globalThis & { __YURI_DB?: D1Database }).__YURI_DB;
  if (!binding) throw new Error("D1 indisponível para pagamento único do Clube Yuri");
  return binding;
}

function dateKeyInBusinessTimeZone(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";
  return year && month && day ? `${year}-${month}-${day}` : "";
}

function dateKey(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return dateKeyInBusinessTimeZone(date);
}

function addDays(dateKeyValue: string, days: number) {
  const date = new Date(`${dateKeyValue}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function oneTimeExternalReference(subscriptionId: number) {
  return `clube-yuri-once:${subscriptionId}`;
}

export function oneTimeSubscriptionId(externalReference: unknown) {
  const match = /^clube-yuri-once:(\d+)$/.exec(String(externalReference || "").trim());
  return match ? Number(match[1]) : 0;
}

export async function ensureOneTimePaymentStore() {
  await d1().prepare(`
    CREATE TABLE IF NOT EXISTS subscription_one_time_payments (
      subscription_id INTEGER PRIMARY KEY,
      preference_id TEXT NOT NULL UNIQUE,
      init_point TEXT NOT NULL DEFAULT '',
      payment_id TEXT NOT NULL DEFAULT '',
      provider_status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();
}

export async function getOneTimePaymentBySubscription(subscriptionId: number) {
  await ensureOneTimePaymentStore();
  return d1()
    .prepare("SELECT * FROM subscription_one_time_payments WHERE subscription_id = ? LIMIT 1")
    .bind(subscriptionId)
    .first<OneTimePaymentRow>();
}

export async function deleteOneTimePaymentBySubscription(subscriptionId: number) {
  await ensureOneTimePaymentStore();
  await d1().prepare("DELETE FROM subscription_one_time_payments WHERE subscription_id = ?").bind(subscriptionId).run();
}

export async function saveOneTimePayment(input: {
  subscriptionId: number;
  preferenceId?: string;
  initPoint?: string;
  paymentId?: string;
  providerStatus?: string;
}) {
  await ensureOneTimePaymentStore();
  const existing = await getOneTimePaymentBySubscription(input.subscriptionId);
  const now = new Date().toISOString();
  const preferenceId = input.preferenceId || existing?.preference_id || "";
  if (!preferenceId) throw new Error("preference_id_missing");
  await d1().prepare(`
    INSERT INTO subscription_one_time_payments (
      subscription_id, preference_id, init_point, payment_id, provider_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(subscription_id) DO UPDATE SET
      preference_id = excluded.preference_id,
      init_point = excluded.init_point,
      payment_id = CASE WHEN excluded.payment_id <> '' THEN excluded.payment_id ELSE subscription_one_time_payments.payment_id END,
      provider_status = excluded.provider_status,
      updated_at = excluded.updated_at
  `).bind(
    input.subscriptionId,
    preferenceId,
    input.initPoint ?? existing?.init_point ?? "",
    input.paymentId ?? existing?.payment_id ?? "",
    input.providerStatus || existing?.provider_status || "pending",
    existing?.created_at || now,
    now,
  ).run();
}

export async function syncLocalOneTimePayment(payment: MercadoPagoOneTimePayment) {
  const subscriptionId = oneTimeSubscriptionId(payment.external_reference);
  if (!subscriptionId || !payment.id) return { ok: false, reason: "foreign_payment" } as const;

  const db = getDb();
  const [local] = await db.select().from(subscriptions).where(eq(subscriptions.id, subscriptionId)).limit(1);
  if (!local) return { ok: false, reason: "local_subscription_not_found" } as const;

  const amount = Number(payment.transaction_amount || 0);
  const sellerId = String(payment.collector_id || "");
  const validPayment =
    payment.currency_id === "BRL" &&
    Math.abs(amount - local.priceCents / 100) < 0.001 &&
    (!sellerId || sellerId === CLUBE_YURI_PROD_SELLER_ID);
  if (!validPayment) return { ok: false, reason: "payment_mismatch" } as const;

  const providerStatus = String(payment.status || "pending").toLowerCase();
  let localStatus = local.status;
  const update: { status?: string; startDate?: string; endDate?: string } = {};

  if (providerStatus === "approved") {
    const startDate = dateKey(payment.date_approved) || dateKey(payment.date_created) || dateKeyInBusinessTimeZone(new Date());
    localStatus = "Ativa";
    update.status = localStatus;
    update.startDate = startDate;
    update.endDate = addDays(startDate, 30);
  } else if (["refunded", "charged_back", "cancelled", "canceled"].includes(providerStatus)) {
    localStatus = "Cancelada";
    update.status = localStatus;
  } else if (local.status !== "Ativa") {
    localStatus = "Aguardando pagamento";
    update.status = localStatus;
  }

  if (Object.keys(update).length) {
    await db.update(subscriptions).set(update).where(eq(subscriptions.id, subscriptionId));
  }

  // O webhook do Checkout Pro pode chegar alguns milissegundos antes de a
  // preferência ter sido persistida localmente. O pagamento já foi validado
  // acima, portanto sincronizamos a assinatura e só atualizamos o vínculo do
  // provedor quando ele já existir. Isso evita transformar uma corrida normal
  // de eventos em erro 500 no webhook.
  const existing = await getOneTimePaymentBySubscription(subscriptionId);
  if (existing?.preference_id) {
    await saveOneTimePayment({
      subscriptionId,
      preferenceId: existing.preference_id,
      initPoint: existing.init_point || "",
      paymentId: String(payment.id),
      providerStatus,
    });
  }

  return { ok: true, subscriptionId, status: localStatus, previousStatus: local.status, providerStatus } as const;
}

export async function syncOneTimeSubscriptionByLocalId(subscriptionId: number) {
  const stored = await getOneTimePaymentBySubscription(subscriptionId);
  if (!stored?.preference_id) return { ok: false, reason: "one_time_payment_not_found" } as const;

  if (stored.payment_id) {
    try {
      const response = await mercadoPagoRequest(`/v1/payments/${encodeURIComponent(stored.payment_id)}`);
      if (response.ok) {
        const payment = await response.json() as MercadoPagoOneTimePayment;
        return syncLocalOneTimePayment(payment);
      }
    } catch {}
  }

  let searchResponse: Response;
  try {
    const reference = encodeURIComponent(oneTimeExternalReference(subscriptionId));
    searchResponse = await mercadoPagoRequest(`/v1/payments/search?external_reference=${reference}&sort=date_created&criteria=desc&limit=10`);
  } catch {
    return { ok: false, reason: "provider_unavailable" } as const;
  }
  if (!searchResponse.ok) return { ok: false, reason: "payment_lookup_failed" } as const;

  const data = await searchResponse.json() as { results?: MercadoPagoOneTimePayment[] };
  const payment = (data.results || []).find((item) => oneTimeSubscriptionId(item.external_reference) === subscriptionId);
  if (!payment?.id) return { ok: false, reason: "payment_not_created_yet" } as const;
  return syncLocalOneTimePayment(payment);
}
