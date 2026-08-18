import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { subscriptions } from "../db/schema";
import { mercadoPagoRuntimeConfig } from "./runtime-config";

export type MercadoPagoPreapproval = {
  id?: string;
  status?: string;
  external_reference?: string | number | null;
  payer_email?: string | null;
  init_point?: string | null;
  next_payment_date?: string | null;
  date_created?: string | null;
  last_modified?: string | null;
  auto_recurring?: {
    frequency?: number;
    frequency_type?: string;
    transaction_amount?: number | string;
    currency_id?: string;
  } | null;
};

type PaymentLinkRow = {
  subscription_id: number;
  mercado_pago_id: string;
  init_point: string;
  provider_status: string;
  next_payment_date: string;
  created_at: string;
  updated_at: string;
};

function d1() {
  const binding = (globalThis as typeof globalThis & { __YURI_DB?: D1Database }).__YURI_DB;
  if (!binding) throw new Error("D1 indisponível para assinaturas");
  return binding;
}

export async function ensureSubscriptionPaymentStore() {
  await d1().prepare(`
    CREATE TABLE IF NOT EXISTS subscription_payments (
      subscription_id INTEGER PRIMARY KEY,
      mercado_pago_id TEXT NOT NULL UNIQUE,
      init_point TEXT NOT NULL DEFAULT '',
      provider_status TEXT NOT NULL DEFAULT 'pending',
      next_payment_date TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();
}

export async function runOneTimeSubscriptionTestReset() {
  await ensureSubscriptionPaymentStore();
  await d1().prepare(`
    CREATE TABLE IF NOT EXISTS app_flags (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    )
  `).run();

  const key = "subscription_test_reset_2026_08_18_v1";
  const existing = await d1()
    .prepare("SELECT key FROM app_flags WHERE key = ? LIMIT 1")
    .bind(key)
    .first<{ key: string }>();

  if (existing?.key) return { reset: false } as const;

  const db = getDb();
  const pending = await db.select().from(subscriptions).where(eq(subscriptions.status, "Aguardando pagamento"));

  for (const item of pending) {
    await db
      .update(subscriptions)
      .set({ status: "Cancelada", startDate: "", endDate: "" })
      .where(eq(subscriptions.id, item.id));
  }

  await d1().prepare("DELETE FROM subscription_payments").run();
  await d1()
    .prepare("INSERT INTO app_flags (key, value, updated_at) VALUES (?, ?, ?)")
    .bind(key, `canceladas:${pending.length}`, new Date().toISOString())
    .run();

  return { reset: true, cancelled: pending.length } as const;
}

export async function getPaymentLinkBySubscription(subscriptionId: number) {
  await ensureSubscriptionPaymentStore();
  return d1()
    .prepare("SELECT * FROM subscription_payments WHERE subscription_id = ? LIMIT 1")
    .bind(subscriptionId)
    .first<PaymentLinkRow>();
}

export async function savePaymentLink(input: {
  subscriptionId: number;
  mercadoPagoId: string;
  initPoint?: string;
  providerStatus?: string;
  nextPaymentDate?: string;
}) {
  await ensureSubscriptionPaymentStore();
  const now = new Date().toISOString();
  await d1()
    .prepare(`
      INSERT INTO subscription_payments (
        subscription_id, mercado_pago_id, init_point, provider_status,
        next_payment_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(subscription_id) DO UPDATE SET
        mercado_pago_id = excluded.mercado_pago_id,
        init_point = excluded.init_point,
        provider_status = excluded.provider_status,
        next_payment_date = excluded.next_payment_date,
        updated_at = excluded.updated_at
    `)
    .bind(
      input.subscriptionId,
      input.mercadoPagoId,
      input.initPoint || "",
      input.providerStatus || "pending",
      input.nextPaymentDate || "",
      now,
      now,
    )
    .run();
}

export function localSubscriptionId(externalReference: unknown) {
  const match = /^clube-yuri:(\d+)$/.exec(String(externalReference || "").trim());
  return match ? Number(match[1]) : 0;
}

export async function mercadoPagoRequest(path: string, init?: RequestInit) {
  const { accessToken } = mercadoPagoRuntimeConfig();
  if (!accessToken) throw new Error("mercadopago_not_configured");
  return fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      accept: "application/json",
      ...(init?.headers || {}),
    },
  });
}

function isoDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function syncLocalSubscriptionFromMercadoPago(preapproval: MercadoPagoPreapproval) {
  const subscriptionId = localSubscriptionId(preapproval.external_reference);
  if (!subscriptionId || !preapproval.id) return { ok: false, reason: "foreign_subscription" } as const;

  const db = getDb();
  const [local] = await db.select().from(subscriptions).where(eq(subscriptions.id, subscriptionId)).limit(1);
  if (!local) return { ok: false, reason: "local_subscription_not_found" } as const;

  const payerEmail = String(preapproval.payer_email || "").trim().toLowerCase();
  const { testPayerEmail } = mercadoPagoRuntimeConfig();
  const acceptedPayerEmails = [local.clientEmail.trim().toLowerCase(), testPayerEmail].filter(Boolean);
  if (payerEmail && !acceptedPayerEmails.includes(payerEmail)) {
    return { ok: false, reason: "payer_mismatch" } as const;
  }

  const recurring = preapproval.auto_recurring || {};
  const amount = Number(recurring.transaction_amount || 0);
  const validPlan =
    recurring.frequency === 1 &&
    recurring.frequency_type === "months" &&
    recurring.currency_id === "BRL" &&
    Math.abs(amount - local.priceCents / 100) < 0.001;
  if (!validPlan) return { ok: false, reason: "plan_mismatch" } as const;

  const providerStatus = String(preapproval.status || "pending").toLowerCase();
  let localStatus = "Aguardando pagamento";
  if (providerStatus === "authorized") localStatus = "Ativa";
  else if (providerStatus === "paused") localStatus = "Bloqueada";
  else if (["cancelled", "canceled"].includes(providerStatus)) localStatus = "Cancelada";

  const update: { status: string; startDate?: string; endDate?: string } = { status: localStatus };
  if (localStatus === "Ativa") {
    const startDate = local.startDate || isoDate(preapproval.last_modified) || isoDate(preapproval.date_created) || new Date().toISOString().slice(0, 10);
    let endDate = isoDate(preapproval.next_payment_date);
    if (!endDate || endDate <= startDate) endDate = addDays(startDate, 30);
    update.startDate = startDate;
    update.endDate = endDate;
  }
  await db.update(subscriptions).set(update).where(eq(subscriptions.id, subscriptionId));
  await savePaymentLink({
    subscriptionId,
    mercadoPagoId: preapproval.id,
    initPoint: preapproval.init_point || "",
    providerStatus,
    nextPaymentDate: preapproval.next_payment_date || "",
  });
  return { ok: true, subscriptionId, status: localStatus, previousStatus: local.status } as const;
}

export async function syncSubscriptionByLocalId(subscriptionId: number) {
  const payment = await getPaymentLinkBySubscription(subscriptionId);
  if (!payment?.mercado_pago_id) return { ok: false, reason: "payment_link_not_found" } as const;

  let providerResponse: Response;
  try {
    providerResponse = await mercadoPagoRequest(`/preapproval/${encodeURIComponent(payment.mercado_pago_id)}`);
  } catch {
    return { ok: false, reason: "provider_unavailable" } as const;
  }
  if (!providerResponse.ok) return { ok: false, reason: "provider_lookup_failed" } as const;

  const preapproval = (await providerResponse.json()) as MercadoPagoPreapproval;
  return syncLocalSubscriptionFromMercadoPago(preapproval);
}
