import { and, eq } from "drizzle-orm";
import type { Database } from "../../db";
import { collaborators, collaboratorServices } from "../../db/schema";
import { clampPercent } from "../domain/money";
import type { SessionUser } from "./auth";
import { ApiError } from "./http";

/** O administrador também atende: garante que ele exista como colaborador (100%). */
export async function ensureOwnerCollaborator(db: Database, user: SessionUser) {
  const [owner] = await db.select().from(collaborators).where(eq(collaborators.email, user.email)).limit(1);
  if (owner) return owner;
  const [created] = await db
    .insert(collaborators)
    .values({
      email: user.email,
      name: user.name && user.name !== user.email ? user.name : "Yuri César",
      defaultCommissionPercent: 100,
      active: true,
      owner: true,
      createdAt: new Date().toISOString(),
    })
    .returning();
  return created;
}

export async function getActiveCollaborator(db: Database, id: number) {
  const [collaborator] = await db.select().from(collaborators).where(eq(collaborators.id, id)).limit(1);
  if (!collaborator || !collaborator.active) throw new ApiError(400, "Profissional não encontrado ou inativo.");
  return collaborator;
}

/** Percentual de comissão: específico do serviço ou, na falta dele, o padrão do colaborador. */
export async function commissionPercentFor(db: Database, collaboratorId: number, serviceId: number) {
  const [collaborator] = await db.select().from(collaborators).where(eq(collaborators.id, collaboratorId)).limit(1);
  const [override] = await db
    .select()
    .from(collaboratorServices)
    .where(
      and(
        eq(collaboratorServices.collaboratorId, collaboratorId),
        eq(collaboratorServices.serviceId, serviceId),
        eq(collaboratorServices.active, true),
      ),
    )
    .limit(1);
  return clampPercent(override?.commissionPercent ?? collaborator?.defaultCommissionPercent ?? 0);
}
