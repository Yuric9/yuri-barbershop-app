import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { appointments, collaborators, collaboratorServices, services, transactions } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { isAdminEmail } from "../../../admin-access";

export const dynamic = "force-dynamic";

function localNow() {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`,
  };
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const isAdmin = user.role === "admin" || isAdminEmail(user.email);
  if (user.role !== "barber" && !isAdmin) {
    return Response.json({ error: "Acesso permitido somente para colaborador ou administrador" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const serviceId = Number(body.serviceId || 0);
  const clientName = String(body.clientName || "Cliente avulso").trim().slice(0, 120) || "Cliente avulso";
  const paymentMethod = String(body.paymentMethod || "Dinheiro").trim().slice(0, 40);
  const note = String(body.note || "").trim().slice(0, 240);

  const db = getDb();
  const collaboratorId = isAdmin ? Number(body.collaboratorId || 0) : 0;
  const [collaborator] = isAdmin
    ? await db.select().from(collaborators).where(eq(collaborators.id, collaboratorId)).limit(1)
    : await db.select().from(collaborators).where(eq(collaborators.email, user.email)).limit(1);

  if (!collaborator || collaborator.active === false) {
    return Response.json({ error: "Colaborador não encontrado ou inativo" }, { status: 404 });
  }

  const [service] = await db.select().from(services).where(and(eq(services.id, serviceId), eq(services.active, true))).limit(1);
  if (!service) return Response.json({ error: "Serviço inválido ou inativo" }, { status: 400 });

  const [override] = await db.select().from(collaboratorServices)
    .where(and(eq(collaboratorServices.collaboratorId, collaborator.id), eq(collaboratorServices.serviceId, service.id), eq(collaboratorServices.active, true)))
    .limit(1);
  const commissionPercent = Math.max(0, Math.min(100, override?.commissionPercent ?? collaborator.defaultCommissionPercent ?? 0));
  const commissionCents = Math.round(service.priceCents * commissionPercent / 100);
  const now = localNow();
  const createdAt = new Date().toISOString();
  const syntheticEmail = `manual-${collaborator.id}-${Date.now()}@cadastro.local`;
  const manualLabel = `${service.name} • Manual`;
  const adminMessage = `Lançamento manual • sem agendamento${note ? ` • ${note}` : ""}`;

  const [appointment] = await db.insert(appointments).values({
    clientEmail: syntheticEmail,
    clientName,
    serviceId: service.id,
    serviceName: manualLabel,
    date: now.date,
    time: now.time,
    status: "Finalizado",
    adminMessage,
    totalCents: service.priceCents,
    collaboratorId: collaborator.id,
    collaboratorName: collaborator.name,
    paymentMethod,
    commissionPercent,
    commissionCents,
    createdAt,
  }).returning();

  const [cashEntry] = await db.insert(transactions).values({
    kind: "entrada",
    description: `${service.name} — lançamento manual sem agendamento — ${clientName}`,
    amountCents: service.priceCents,
    date: now.date,
    appointmentId: appointment.id,
    clientEmail: "",
    clientName,
    serviceId: service.id,
    serviceName: manualLabel,
    collaboratorId: collaborator.id,
    paymentMethod,
    createdAt,
  }).returning();

  await db.update(appointments).set({ cashTransactionId: cashEntry.id }).where(eq(appointments.id, appointment.id));

  return Response.json({
    ok: true,
    source: "manual",
    appointmentId: appointment.id,
    transactionId: cashEntry.id,
    date: now.date,
    time: now.time,
    commissionPercent,
    commissionCents,
  });
}
