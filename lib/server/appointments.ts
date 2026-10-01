/**
 * Regras de agendamento que dependem do banco: disponibilidade, criação com
 * reserva de horário e mudança de status (com lançamento no caixa).
 */
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { appointmentSlots, appointments, collaborators, profiles, scheduleBlocks, services, transactions } from "../../db/schema";
import { COURTESY, canTransition, type AppointmentStatus } from "../domain/catalog";
import { nowMinutes, todayKey } from "../domain/dates";
import { loyaltySnapshot } from "../domain/loyalty";
import { percentOf } from "../domain/money";
import { findFreeResource, isPastSlot, resourceKeyFor, slotsCovered, startTimesFor } from "../domain/schedule";
import { isPaidVisit } from "./clients";
import { commissionPercentFor } from "./collaborators";
import { ApiError } from "./http";

type AppointmentRow = typeof appointments.$inferSelect;

async function loadServices(db: Database, ids: number[]) {
  const unique = [...new Set(ids)].slice(0, 10);
  if (!unique.length) throw new ApiError(400, "Escolha pelo menos um serviço.");
  const rows = await db.select().from(services).where(and(inArray(services.id, unique), eq(services.active, true)));
  if (rows.length !== unique.length) throw new ApiError(400, "Um dos serviços escolhidos não está disponível.");
  // Mantém a ordem escolhida pelo usuário.
  return unique.map((id) => rows.find((row) => row.id === id)!);
}

/** Barbeiros que podem atender: o escolhido ou todos os ativos. */
async function candidateResources(db: Database, collaboratorId: number | null) {
  if (collaboratorId) return [resourceKeyFor(collaboratorId)];
  const active = await db.select({ id: collaborators.id }).from(collaborators).where(eq(collaborators.active, true));
  return active.length ? active.map((item) => resourceKeyFor(item.id)) : [resourceKeyFor(null)];
}

async function dayReservations(db: Database, date: string) {
  const [locks, blocks] = await Promise.all([
    db.select().from(appointmentSlots).where(eq(appointmentSlots.date, date)),
    db.select().from(scheduleBlocks).where(eq(scheduleBlocks.date, date)),
  ]);
  return { locks, blocks };
}

/** Horários de início livres para os serviços escolhidos em uma data. */
export async function availableTimes(db: Database, input: { date: string; serviceIds: number[]; collaboratorId: number | null }) {
  const selected = await loadServices(db, input.serviceIds);
  const durationMin = selected.reduce((sum, service) => sum + service.durationMin, 0);
  const [resources, { locks, blocks }] = await Promise.all([
    candidateResources(db, input.collaboratorId),
    dayReservations(db, input.date),
  ]);
  const today = todayKey();
  const minutes = nowMinutes();
  const times = startTimesFor(input.date, durationMin).filter(
    (time) =>
      !isPastSlot(input.date, time, today, minutes) &&
      findFreeResource({ time, durationMin, resources, locks, blocks }) !== null,
  );
  return { durationMin, times };
}

export async function createAppointment(
  db: Database,
  input: {
    client: { email: string; name: string };
    serviceIds: number[];
    collaboratorId: number | null;
    date: string;
    time: string;
    note: string;
  },
) {
  const selected = await loadServices(db, input.serviceIds);
  const durationMin = selected.reduce((sum, service) => sum + service.durationMin, 0);
  const totalCents = selected.reduce((sum, service) => sum + service.priceCents, 0);

  if (!startTimesFor(input.date, durationMin).includes(input.time)) {
    throw new ApiError(400, "Os serviços escolhidos não cabem neste horário antes do fechamento.");
  }
  if (isPastSlot(input.date, input.time, todayKey(), nowMinutes())) {
    throw new ApiError(400, "Este horário já passou.");
  }

  const [resources, { locks, blocks }] = await Promise.all([
    candidateResources(db, input.collaboratorId),
    dayReservations(db, input.date),
  ]);
  const resourceKey = findFreeResource({ time: input.time, durationMin, resources, locks, blocks });
  if (!resourceKey) throw new ApiError(409, "Este horário já está ocupado. Escolha outro.");

  const collaboratorId = resourceKey.startsWith("barber:") ? Number(resourceKey.slice(7)) : null;
  const [collaborator] = collaboratorId
    ? await db.select().from(collaborators).where(eq(collaborators.id, collaboratorId)).limit(1)
    : [];

  // Reserva as faixas de horário primeiro: o índice único do banco impede que
  // duas requisições simultâneas peguem o mesmo horário.
  const now = new Date().toISOString();
  const reservationId = crypto.randomUUID();
  try {
    await db.insert(appointmentSlots).values(
      slotsCovered(input.time, durationMin).map((time) => ({ date: input.date, time, resourceKey, reservationId, createdAt: now })),
    );
  } catch {
    throw new ApiError(409, "Este horário acabou de ser reservado. Escolha outro.");
  }

  try {
    const details = selected.map((service) => `${service.name} (${service.durationMin} min)`).join(", ");
    const [created] = await db
      .insert(appointments)
      .values({
        clientEmail: input.client.email,
        clientName: input.client.name,
        serviceId: selected[0].id,
        serviceName: selected.map((service) => service.name).join(" + "),
        date: input.date,
        time: input.time,
        totalCents,
        collaboratorId: collaborator?.id ?? null,
        collaboratorName: collaborator?.name ?? "",
        adminMessage: [input.note, `Serviços: ${details} · ${durationMin} min`].filter(Boolean).join(" · "),
        createdAt: now,
      })
      .returning();
    await db.update(appointmentSlots).set({ appointmentId: created.id }).where(eq(appointmentSlots.reservationId, reservationId));
    return created;
  } catch (error) {
    await db.delete(appointmentSlots).where(eq(appointmentSlots.reservationId, reservationId));
    throw error;
  }
}

export async function getAppointment(db: Database, id: number) {
  const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
  if (!appointment) throw new ApiError(404, "Agendamento não encontrado.");
  return appointment;
}

/**
 * Atualiza o status de um agendamento.
 * - Cancelado: libera o horário reservado.
 * - Finalizado: lança a entrada no caixa e calcula a comissão do barbeiro;
 *   com pagamento "Cortesia", consome um benefício do cartão fidelidade.
 */
export async function changeAppointmentStatus(
  db: Database,
  appointment: AppointmentRow,
  status: AppointmentStatus,
  paymentMethod: string,
  actorEmail: string,
) {
  if (!canTransition(appointment.status, status)) {
    throw new ApiError(409, `Um agendamento ${appointment.status.toLowerCase()} não pode mudar para ${status.toLowerCase()}.`);
  }

  if (status === "Finalizado" && appointment.date > todayKey()) {
    throw new ApiError(409, "Só é possível finalizar atendimentos de hoje ou de dias anteriores.");
  }

  // A condição `status = atual` evita processar duas vezes o mesmo clique.
  const claim = (values: Partial<AppointmentRow>) =>
    db
      .update(appointments)
      .set({ status, ...values })
      .where(and(eq(appointments.id, appointment.id), eq(appointments.status, appointment.status)))
      .returning({ id: appointments.id });

  if (status !== "Finalizado") {
    const updated = await claim({});
    if (!updated.length) throw new ApiError(409, "O agendamento foi alterado por outra pessoa. Atualize a página.");
    if (status === "Cancelado") await db.delete(appointmentSlots).where(eq(appointmentSlots.appointmentId, appointment.id));
    return;
  }

  const now = new Date().toISOString();

  if (paymentMethod === COURTESY) {
    const [profile] = await db.select().from(profiles).where(eq(profiles.email, appointment.clientEmail)).limit(1);
    const history = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.clientEmail, appointment.clientEmail), ne(appointments.id, appointment.id)));
    if (!profile || !loyaltySnapshot(profile, history.filter(isPaidVisit).length).rewardAvailable) {
      throw new ApiError(409, "Este cliente ainda não possui atendimento gratuito disponível.");
    }
    const updated = await claim({ paymentMethod, commissionPercent: 0, commissionCents: 0, cashTransactionId: null });
    if (!updated.length) throw new ApiError(409, "O agendamento foi alterado por outra pessoa. Atualize a página.");
    await db
      .update(profiles)
      .set({ loyaltyRewardsRedeemed: sql`${profiles.loyaltyRewardsRedeemed} + 1`, loyaltyUpdatedAt: now, loyaltyUpdatedBy: actorEmail })
      .where(eq(profiles.email, appointment.clientEmail));
    return;
  }

  const commissionPercent = appointment.collaboratorId
    ? await commissionPercentFor(db, appointment.collaboratorId, appointment.serviceId)
    : 0;
  const updated = await claim({ paymentMethod, commissionPercent, commissionCents: percentOf(appointment.totalCents, commissionPercent) });
  if (!updated.length) throw new ApiError(409, "O agendamento foi alterado por outra pessoa. Atualize a página.");

  const [profile] = await db.select().from(profiles).where(eq(profiles.email, appointment.clientEmail)).limit(1);
  const [cashEntry] = await db
    .insert(transactions)
    .values({
      kind: "entrada",
      description: `${appointment.serviceName} — ${appointment.clientName}`,
      amountCents: appointment.totalCents,
      date: appointment.date,
      appointmentId: appointment.id,
      clientEmail: profile?.email ?? "",
      clientName: appointment.clientName,
      serviceId: appointment.serviceId,
      serviceName: appointment.serviceName,
      collaboratorId: appointment.collaboratorId,
      paymentMethod,
      createdAt: now,
    })
    .returning();
  await db.update(appointments).set({ cashTransactionId: cashEntry.id }).where(eq(appointments.id, appointment.id));
}
