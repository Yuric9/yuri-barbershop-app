import { desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { subscriptions } from "../db/schema";
import {
  getPaymentLinkBySubscription,
  mercadoPagoRequest,
  savePaymentLink,
  syncSubscriptionByLocalId,
} from "./mercadopago-subscriptions";
import {
  getOneTimePaymentBySubscription,
  saveOneTimePayment,
  syncOneTimeSubscriptionByLocalId,
} from "./subscription-one-time";

export const PENDING_ATTEMPT_TTL_MS = 60 * 60 * 1000;

type ExpireOptions = {
  force?: boolean;
  latestOnly?: boolean;
};

function timestamp(value?: string | null) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function isTerminalPaymentStatus(status?: string | null) {
  return ["approved", "rejected", "cancelled", "canceled", "expired", "refunded", "charged_back"].includes(
    String(status || "").toLowerCase(),
  );
}

async function expireOneTimeAttempt(item: typeof subscriptions.$inferSelect) {
  const db = getDb();
  const stored = await getOneTimePaymentBySubscription(item.id);
  if (!stored) return false;

  const sync = await syncOneTimeSubscriptionByLocalId(item.id);
  if (sync.ok) {
    if (sync.status === "Ativa") return false;
    const refreshed = await getOneTimePaymentBySubscription(item.id);
    const providerStatus = String(refreshed?.provider_status || "").toLowerCase();

    // Se já existe um pagamento real aguardando compensação, não expiramos a
    // tentativa local. Isso protege Pix ou outro meio que já tenha sido gerado.
    if (refreshed?.payment_id && !isTerminalPaymentStatus(providerStatus)) return false;
    if (sync.status !== "Aguardando pagamento" && sync.status !== "Cancelada") return false;
  } else if (!["payment_not_created_yet", "one_time_payment_not_found"].includes(String(sync.reason || ""))) {
    // Em indisponibilidade do provedor, é mais seguro manter pendente do que
    // liberar uma nova tentativa que poderia duplicar um pagamento existente.
    return false;
  }

  if (stored.preference_id) {
    const from = stored.created_at || item.createdAt || new Date(Date.now() - PENDING_ATTEMPT_TTL_MS).toISOString();
    const to = new Date(Date.now() + 5_000).toISOString();
    try {
      const response = await mercadoPagoRequest(`/checkout/preferences/${encodeURIComponent(stored.preference_id)}`, {
        method: "PUT",
        body: JSON.stringify({
          expires: true,
          expiration_date_from: from,
          expiration_date_to: to,
        }),
      });
      if (!response.ok) return false;
    } catch {
      return false;
    }
  }

  await db.update(subscriptions).set({ status: "Expirada" }).where(eq(subscriptions.id, item.id));
  await saveOneTimePayment({
    subscriptionId: item.id,
    preferenceId: stored.preference_id,
    initPoint: stored.init_point,
    paymentId: stored.payment_id,
    providerStatus: "expired",
  });
  return true;
}

async function expireRecurringAttempt(item: typeof subscriptions.$inferSelect) {
  const db = getDb();
  const stored = await getPaymentLinkBySubscription(item.id);

  if (!stored?.mercado_pago_id) {
    await db.update(subscriptions).set({ status: "Expirada" }).where(eq(subscriptions.id, item.id));
    return true;
  }

  const sync = await syncSubscriptionByLocalId(item.id);
  if (sync.ok) {
    if (sync.status === "Ativa" || sync.status === "Bloqueada") return false;
    if (sync.status === "Cancelada" && sync.previousStatus === "Aguardando pagamento") {
      await db.update(subscriptions).set({ status: "Expirada" }).where(eq(subscriptions.id, item.id));
      await savePaymentLink({
        subscriptionId: item.id,
        mercadoPagoId: stored.mercado_pago_id,
        initPoint: stored.init_point,
        providerStatus: "canceled",
        nextPaymentDate: stored.next_payment_date,
      });
      return true;
    }
    if (sync.status !== "Aguardando pagamento") return false;
  } else if (!["payment_link_not_found"].includes(String(sync.reason || ""))) {
    return false;
  }

  try {
    const response = await mercadoPagoRequest(`/preapproval/${encodeURIComponent(stored.mercado_pago_id)}`, {
      method: "PUT",
      body: JSON.stringify({ status: "canceled" }),
    });
    if (!response.ok) return false;
  } catch {
    return false;
  }

  await db.update(subscriptions).set({ status: "Expirada" }).where(eq(subscriptions.id, item.id));
  await savePaymentLink({
    subscriptionId: item.id,
    mercadoPagoId: stored.mercado_pago_id,
    initPoint: stored.init_point,
    providerStatus: "canceled",
    nextPaymentDate: stored.next_payment_date,
  });
  return true;
}

export async function expirePendingSubscriptionsForClient(clientEmail: string, options: ExpireOptions = {}) {
  const db = getDb();
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.clientEmail, clientEmail))
    .orderBy(desc(subscriptions.id));

  const pending = rows.filter((item) => item.status === "Aguardando pagamento");
  const candidates = options.latestOnly ? pending.slice(0, 1) : pending;
  const expiredIds: number[] = [];

  for (const item of candidates) {
    const createdAt = timestamp(item.createdAt);
    const oldEnough = createdAt > 0 && Date.now() - createdAt >= PENDING_ATTEMPT_TTL_MS;
    if (!options.force && !oldEnough) continue;

    const oneTime = await getOneTimePaymentBySubscription(item.id);
    const expired = oneTime ? await expireOneTimeAttempt(item) : await expireRecurringAttempt(item);
    if (expired) expiredIds.push(item.id);
  }

  return { expired: expiredIds.length, expiredIds };
}
