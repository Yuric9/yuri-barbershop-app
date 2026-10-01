import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { appointments, services, transactions } from "../../../db/schema";
import { PAYMENT_METHODS } from "../../../lib/domain/catalog";
import { nowTime, todayKey } from "../../../lib/domain/dates";
import { percentOf } from "../../../lib/domain/money";
import { commissionPercentFor, getActiveCollaborator } from "../../../lib/server/collaborators";
import { adminRoute, ApiError, ok, readBody } from "../../../lib/server/http";
import { optionalText, positiveId } from "../../../lib/server/validation";

export const dynamic = "force-dynamic";

const walkIn = z.object({
  collaboratorId: positiveId,
  serviceId: positiveId,
  clientName: z.string().trim().max(120).optional().default(""),
  paymentMethod: z.enum(PAYMENT_METHODS),
  note: optionalText(240),
});

/**
 * Atendimento avulso (cliente sem agendamento): registra o atendimento já
 * finalizado, lança a entrada no caixa e calcula a comissão do barbeiro.
 */
export const POST = adminRoute(async ({ request }) => {
  const input = await readBody(request, walkIn);
  const db = getDb();
  const collaborator = await getActiveCollaborator(db, input.collaboratorId);
  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, input.serviceId), eq(services.active, true)))
    .limit(1);
  if (!service) throw new ApiError(400, "Serviço inválido ou inativo.");

  const commissionPercent = await commissionPercentFor(db, collaborator.id, service.id);
  const clientName = input.clientName || "Cliente avulso";
  const date = todayKey();
  const createdAt = new Date().toISOString();

  const [appointment] = await db
    .insert(appointments)
    .values({
      clientEmail: `avulso-${crypto.randomUUID()}@cadastro.local`,
      clientName,
      serviceId: service.id,
      serviceName: service.name,
      date,
      time: nowTime(),
      status: "Finalizado",
      adminMessage: ["Atendimento avulso, sem agendamento", input.note].filter(Boolean).join(" · "),
      totalCents: service.priceCents,
      collaboratorId: collaborator.id,
      collaboratorName: collaborator.name,
      paymentMethod: input.paymentMethod,
      commissionPercent,
      commissionCents: percentOf(service.priceCents, commissionPercent),
      createdAt,
    })
    .returning();

  const [entry] = await db
    .insert(transactions)
    .values({
      kind: "entrada",
      description: `${service.name} (avulso) — ${clientName}`,
      amountCents: service.priceCents,
      date,
      appointmentId: appointment.id,
      clientName,
      serviceId: service.id,
      serviceName: service.name,
      collaboratorId: collaborator.id,
      paymentMethod: input.paymentMethod,
      createdAt,
    })
    .returning();
  await db.update(appointments).set({ cashTransactionId: entry.id }).where(eq(appointments.id, appointment.id));

  return ok({ appointment, transaction: entry }, 201);
});
