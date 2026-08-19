import { desc } from "drizzle-orm";
import { getDb } from "../../../../db";
import { appointments, profiles, subscriptions } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import {
  ensureSubscriptionPaymentStore,
  syncSubscriptionByLocalId,
} from "../../../mercadopago-subscriptions";
import { rejectCrossSiteWrite } from "../../../request-security";
import { getArchivedSubscriptionIds } from "../../../subscription-archive-store";

export const dynamic = "force-dynamic";

const BUSINESS_TIME_ZONE = "America/Sao_Paulo";
const CLUB_USAGE_LIMIT = 6;

type PaymentRow = {
  subscription_id: number;
  mercado_pago_id: string;
  provider_status: string;
  next_payment_date: string;
  updated_at: string;
};

function unauthorized() {
  return Response.json({ error: "Acesso restrito ao administrador" }, { status: 403 });
}

function dateKeyInBusinessTimeZone(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
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

function localToday() {
  return dateKeyInBusinessTimeZone(new Date());
}

function providerDateKey(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "" : dateKeyInBusinessTimeZone(date);
}

function daysBetween(from: string, to: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return null;
  const start = new Date(`${from}T12:00:00Z`).getTime();
  const end = new Date(`${to}T12:00:00Z`).getTime();
  return Math.round((end - start) / 86400000);
}

async function paymentRows() {
  try {
    await ensureSubscriptionPaymentStore();
    const binding = (globalThis as typeof globalThis & { __YURI_DB?: D1Database }).__YURI_DB;
    if (!binding) return [] as PaymentRow[];
    const result = await binding
      .prepare(
        `SELECT subscription_id, mercado_pago_id, provider_status, next_payment_date, updated_at
         FROM subscription_payments
         ORDER BY updated_at DESC`,
      )
      .all<PaymentRow>();
    return result.results || [];
  } catch {
    return [] as PaymentRow[];
  }
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user || user.role !== "admin") return unauthorized();

  const db = getDb();
  const [subscriptionRows, appointmentRows, profileRows, payments, archivedIds] = await Promise.all([
    db.select().from(subscriptions).orderBy(desc(subscriptions.id)),
    db.select().from(appointments).orderBy(desc(appointments.date), desc(appointments.time)),
    db.select().from(profiles),
    paymentRows(),
    getArchivedSubscriptionIds(),
  ]);

  const today = localToday();
  const profileByEmail = new Map(profileRows.map((profile) => [profile.email.toLowerCase(), profile]));
  const paymentBySubscription = new Map(payments.map((payment) => [payment.subscription_id, payment]));

  const allRows = subscriptionRows.map((subscription) => {
    const email = subscription.clientEmail.toLowerCase();
    const profile = profileByEmail.get(email);
    const payment = paymentBySubscription.get(subscription.id);
    const effectiveStatus =
      subscription.status === "Ativa" && subscription.endDate && subscription.endDate < today
        ? "Vencida"
        : subscription.status;

    const clientAppointments = appointmentRows.filter((appointment) => appointment.clientEmail.toLowerCase() === email);
    const finalized = clientAppointments.filter((appointment) => appointment.status === "Finalizado");
    const cycleFinalized = finalized.filter((appointment) => {
      if (!subscription.startDate || !subscription.endDate) return false;
      return appointment.date >= subscription.startDate && appointment.date <= subscription.endDate;
    });
    const upcoming = clientAppointments
      .filter((appointment) => appointment.status !== "Cancelado" && appointment.date >= today)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];
    const lastVisit = finalized
      .slice()
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))[0];

    const providerNextDate = providerDateKey(payment?.next_payment_date);
    const nextRenewal = providerNextDate || subscription.endDate || "";
    const daysUntilRenewal = nextRenewal ? daysBetween(today, nextRenewal) : null;

    return {
      id: subscription.id,
      clientName: subscription.clientName,
      clientEmail: subscription.clientEmail,
      phone: profile?.phone || "",
      status: effectiveStatus,
      storedStatus: subscription.status,
      priceCents: subscription.priceCents,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      adminMessage: subscription.adminMessage,
      createdAt: subscription.createdAt,
      usageCount: Math.min(CLUB_USAGE_LIMIT, cycleFinalized.length),
      usageRawCount: cycleFinalized.length,
      usageLimit: CLUB_USAGE_LIMIT,
      lastVisit: lastVisit ? { date: lastVisit.date, time: lastVisit.time, serviceName: lastVisit.serviceName } : null,
      nextAppointment: upcoming ? { date: upcoming.date, time: upcoming.time, serviceName: upcoming.serviceName, status: upcoming.status } : null,
      providerConnected: Boolean(payment?.mercado_pago_id),
      providerStatus: payment?.provider_status || "",
      nextRenewal,
      daysUntilRenewal,
      providerUpdatedAt: payment?.updated_at || "",
    };
  });

  // Arquivar é apenas organização administrativa. Se o provedor voltar a deixar
  // a assinatura ativa, ela reaparece automaticamente na gestão principal.
  const rows = allRows.filter((row) => row.status === "Ativa" || !archivedIds.has(row.id));
  const activeRows = rows.filter((row) => row.status === "Ativa");
  const metrics = {
    active: activeRows.length,
    recurringCents: activeRows.reduce((sum, row) => sum + row.priceCents, 0),
    pending: rows.filter((row) => row.status === "Aguardando pagamento").length,
    renewSoon: activeRows.filter(
      (row) => row.daysUntilRenewal !== null && row.daysUntilRenewal >= 0 && row.daysUntilRenewal <= 7,
    ).length,
    blocked: rows.filter((row) => row.status === "Bloqueada").length,
    cancelled: rows.filter((row) => row.status === "Cancelada").length,
  };

  return Response.json({ ok: true, today, metrics, subscriptions: rows });
}

export async function POST(request: Request) {
  const originError = rejectCrossSiteWrite(request);
  if (originError) return originError;

  const user = await getChatGPTUser();
  if (!user || user.role !== "admin") return unauthorized();

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action || "");
  const id = Number(body.id || 0);
  if (!id) return Response.json({ error: "Assinatura inválida" }, { status: 400 });

  if (action === "sync") {
    const result = await syncSubscriptionByLocalId(id);
    if (!result.ok) {
      return Response.json({ error: "Não foi possível sincronizar esta assinatura agora.", detail: result.reason }, { status: 409 });
    }
    return Response.json({ ok: true, result });
  }

  return Response.json({ error: "Ação inválida" }, { status: 400 });
}
