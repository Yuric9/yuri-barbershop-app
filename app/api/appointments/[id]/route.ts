import { z } from "zod";
import { getDb } from "../../../../db";
import { APPOINTMENT_STATUSES, COURTESY, PAYMENT_METHODS } from "../../../../lib/domain/catalog";
import { changeAppointmentStatus, getAppointment } from "../../../../lib/server/appointments";
import { adminRoute, idParam, ok, readBody } from "../../../../lib/server/http";

export const dynamic = "force-dynamic";

const statusChange = z.object({
  status: z.enum(APPOINTMENT_STATUSES, { error: "Status inválido." }),
  paymentMethod: z.enum([...PAYMENT_METHODS, COURTESY]).optional().default("Pix"),
});

export const PATCH = adminRoute<{ id: string }>(async ({ request, params, user }) => {
  const db = getDb();
  const appointment = await getAppointment(db, idParam(params.id));
  const { status, paymentMethod } = await readBody(request, statusChange);
  await changeAppointmentStatus(db, appointment, status, paymentMethod, user.email);
  return ok({ appointment: await getAppointment(db, appointment.id) });
});
