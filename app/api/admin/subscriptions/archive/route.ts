import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { appointments, profiles, subscriptions } from "../../../../../db/schema";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { rejectCrossSiteWrite } from "../../../../request-security";
import {
  archiveSubscription,
  getSubscriptionArchiveRows,
  unarchiveSubscription,
} from "../../../../subscription-archive-store";

export const dynamic = "force-dynamic";

function unauthorized() {
  return Response.json({ error: "Acesso restrito ao administrador" }, { status: 403 });
}

function localToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";
  return `${year}-${month}-${day}`;
}

function effectiveStatus(subscription: { status: string; endDate: string }) {
  if (subscription.status === "Ativa" && subscription.endDate && subscription.endDate < localToday()) return "Vencida";
  return subscription.status;
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user || user.role !== "admin") return unauthorized();

  const db = getDb();
  const [archives, subscriptionRows, profileRows, appointmentRows] = await Promise.all([
    getSubscriptionArchiveRows(),
    db.select().from(subscriptions).orderBy(desc(subscriptions.id)),
    db.select().from(profiles),
    db.select().from(appointments).orderBy(desc(appointments.date), desc(appointments.time)),
  ]);

  const subscriptionsById = new Map(subscriptionRows.map((item) => [item.id, item]));
  const profilesByEmail = new Map(profileRows.map((item) => [item.email.toLowerCase(), item]));

  const rows = archives.flatMap((archive) => {
    const subscription = subscriptionsById.get(Number(archive.subscription_id));
    if (!subscription) return [];
    const status = effectiveStatus(subscription);
    // Se uma assinatura arquivada voltar a ficar ativa pelo provedor, ela não deve ficar escondida.
    if (status === "Ativa") return [];
    const email = subscription.clientEmail.toLowerCase();
    const profile = profilesByEmail.get(email);
    const clientAppointments = appointmentRows.filter((item) => item.clientEmail.toLowerCase() === email);
    const finalized = clientAppointments.filter((item) => item.status === "Finalizado");
    const lastVisit = finalized[0] || null;
    return [{
      id: subscription.id,
      clientName: subscription.clientName,
      clientEmail: subscription.clientEmail,
      phone: profile?.phone || "",
      status,
      statusAtArchive: archive.status_at_archive,
      archivedAt: archive.archived_at,
      note: archive.note,
      priceCents: subscription.priceCents,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      lastVisit: lastVisit ? { date: lastVisit.date, time: lastVisit.time, serviceName: lastVisit.serviceName } : null,
    }];
  });

  return Response.json({ ok: true, archived: rows });
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

  const db = getDb();
  const [current] = await db.select().from(subscriptions).where(eq(subscriptions.id, id)).limit(1);
  if (!current) return Response.json({ error: "Assinatura não encontrada" }, { status: 404 });

  if (action === "archive") {
    const status = effectiveStatus(current);
    if (status === "Ativa") {
      return Response.json({ error: "Assinaturas ativas não podem ser arquivadas." }, { status: 409 });
    }
    await archiveSubscription({ subscriptionId: id, status, note: String(body.note || "") });
    return Response.json({ ok: true, archived: true });
  }

  if (action === "restore") {
    await unarchiveSubscription(id);
    return Response.json({ ok: true, archived: false });
  }

  return Response.json({ error: "Ação inválida" }, { status: 400 });
}
