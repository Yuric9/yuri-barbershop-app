import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { appointments, collaborators, collaboratorServices } from "../../../db/schema";
import { todayKey } from "../../../lib/domain/dates";
import { ensureOwnerCollaborator } from "../../../lib/server/collaborators";
import { adminRoute, ApiError, ok, readBody } from "../../../lib/server/http";
import { collaboratorFields } from "../../../lib/server/validation";

export const dynamic = "force-dynamic";

/** Colaboradores com comissões por serviço e ganhos (mês atual e total). */
export const GET = adminRoute(async ({ user }) => {
  const db = getDb();
  await ensureOwnerCollaborator(db, user);
  const [rows, overrides, finalized] = await Promise.all([
    db.select().from(collaborators).orderBy(collaborators.name),
    db.select().from(collaboratorServices).where(eq(collaboratorServices.active, true)),
    db.select().from(appointments).where(eq(appointments.status, "Finalizado")),
  ]);
  const month = todayKey().slice(0, 7);
  return ok({
    collaborators: rows.map((collaborator) => {
      const done = finalized.filter((item) => item.collaboratorId === collaborator.id);
      const thisMonth = done.filter((item) => item.date.startsWith(month));
      return {
        ...collaborator,
        commissions: overrides
          .filter((item) => item.collaboratorId === collaborator.id && item.commissionPercent !== null)
          .map((item) => ({ serviceId: item.serviceId, percent: item.commissionPercent as number })),
        stats: {
          finalizedCount: done.length,
          monthCount: thisMonth.length,
          monthRevenueCents: thisMonth.reduce((sum, item) => sum + item.totalCents, 0),
          monthCommissionCents: thisMonth.reduce((sum, item) => sum + item.commissionCents, 0),
          totalCommissionCents: done.reduce((sum, item) => sum + item.commissionCents, 0),
        },
      };
    }),
  });
});

export const POST = adminRoute(async ({ request }) => {
  const input = await readBody(request, collaboratorFields.partial({ phone: true, active: true }));
  const db = getDb();
  const [existing] = await db.select().from(collaborators).where(eq(collaborators.email, input.email)).limit(1);
  if (existing) throw new ApiError(409, "Já existe um colaborador com este e-mail.");
  const [created] = await db
    .insert(collaborators)
    .values({ ...input, phone: input.phone ?? "", active: input.active ?? true, owner: false, createdAt: new Date().toISOString() })
    .returning();
  return ok({ collaborator: created }, 201);
});
