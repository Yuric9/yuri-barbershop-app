import { and, asc, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { appointments } from "../../../db/schema";
import { createAppointment } from "../../../lib/server/appointments";
import { getClient, upsertClientByPhone } from "../../../lib/server/clients";
import { getActiveCollaborator } from "../../../lib/server/collaborators";
import { adminRoute, ApiError, ok, readBody } from "../../../lib/server/http";
import { clientFields, dateKey, optionalId, optionalText, positiveId, time } from "../../../lib/server/validation";

export const dynamic = "force-dynamic";

const range = z.object({ from: dateKey, to: dateKey });

/** Agendamentos entre duas datas (inclusive). */
export const GET = adminRoute(async ({ request }) => {
  const url = new URL(request.url);
  const { from, to } = range.parse({ from: url.searchParams.get("from"), to: url.searchParams.get("to") });
  const rows = await getDb()
    .select()
    .from(appointments)
    .where(and(gte(appointments.date, from), lte(appointments.date, to)))
    .orderBy(asc(appointments.date), asc(appointments.time));
  return ok({ appointments: rows });
});

const newAppointment = z.object({
  /** Cliente já cadastrado (pelo e-mail) ou um novo (nome e telefone). */
  clientEmail: z.string().trim().toLowerCase().optional(),
  newClient: clientFields.optional(),
  serviceIds: z.array(positiveId).min(1, "Escolha pelo menos um serviço.").max(10),
  collaboratorId: optionalId,
  date: dateKey,
  time,
  note: optionalText(240),
});

export const POST = adminRoute(async ({ request }) => {
  const input = await readBody(request, newAppointment);
  const db = getDb();

  let client: { email: string; name: string };
  if (input.clientEmail) client = await getClient(db, input.clientEmail);
  else if (input.newClient) client = await upsertClientByPhone(db, input.newClient, new Date().toISOString());
  else throw new ApiError(400, "Escolha o cliente ou cadastre um novo.");

  if (input.collaboratorId) await getActiveCollaborator(db, input.collaboratorId);

  const appointment = await createAppointment(db, {
    client: { email: client.email, name: client.name },
    serviceIds: input.serviceIds,
    collaboratorId: input.collaboratorId,
    date: input.date,
    time: input.time,
    note: input.note,
  });
  return ok({ appointment }, 201);
});
