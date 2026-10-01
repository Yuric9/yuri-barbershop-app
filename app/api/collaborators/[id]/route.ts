import { and, eq, ne } from "drizzle-orm";
import { getDb } from "../../../../db";
import { collaborators } from "../../../../db/schema";
import { adminRoute, ApiError, idParam, notFound, ok, readBody } from "../../../../lib/server/http";
import { collaboratorFields } from "../../../../lib/server/validation";

export const dynamic = "force-dynamic";

export const PATCH = adminRoute<{ id: string }>(async ({ request, params }) => {
  const id = idParam(params.id);
  const input = await readBody(request, collaboratorFields.partial());
  const db = getDb();
  if (input.email) {
    const [duplicate] = await db
      .select()
      .from(collaborators)
      .where(and(eq(collaborators.email, input.email), ne(collaborators.id, id)))
      .limit(1);
    if (duplicate) throw new ApiError(409, "Já existe um colaborador com este e-mail.");
  }
  const [current] = await db.select().from(collaborators).where(eq(collaborators.id, id)).limit(1);
  if (!current) throw notFound("Colaborador");
  // O proprietário é o login do administrador: o e-mail dele não muda por aqui.
  if (current.owner && input.email && input.email !== current.email) {
    throw new ApiError(400, "O e-mail do proprietário é o mesmo do login e não pode ser alterado aqui.");
  }
  const [updated] = await db.update(collaborators).set(input).where(eq(collaborators.id, id)).returning();
  return ok({ collaborator: updated });
});
