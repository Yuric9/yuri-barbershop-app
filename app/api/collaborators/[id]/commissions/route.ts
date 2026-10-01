import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../../../db";
import { collaboratorServices } from "../../../../../db/schema";
import { adminRoute, idParam, ok, readBody } from "../../../../../lib/server/http";
import { percent, positiveId } from "../../../../../lib/server/validation";

export const dynamic = "force-dynamic";

const commission = z.object({
  serviceId: positiveId,
  /** `null` volta a usar o percentual padrão do colaborador. */
  percent: percent.nullable(),
});

export const PUT = adminRoute<{ id: string }>(async ({ request, params }) => {
  const collaboratorId = idParam(params.id);
  const { serviceId, percent: value } = await readBody(request, commission);
  const db = getDb();
  const [existing] = await db
    .select()
    .from(collaboratorServices)
    .where(and(eq(collaboratorServices.collaboratorId, collaboratorId), eq(collaboratorServices.serviceId, serviceId)))
    .limit(1);
  if (existing) {
    await db.update(collaboratorServices).set({ commissionPercent: value, active: true }).where(eq(collaboratorServices.id, existing.id));
  } else {
    await db.insert(collaboratorServices).values({ collaboratorId, serviceId, commissionPercent: value, active: true });
  }
  return ok({ ok: true });
});
