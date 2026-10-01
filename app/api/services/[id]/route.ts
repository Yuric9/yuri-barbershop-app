import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { services } from "../../../../db/schema";
import { adminRoute, idParam, notFound, ok, readBody } from "../../../../lib/server/http";
import { serviceFields } from "../../../../lib/server/validation";

export const dynamic = "force-dynamic";

export const PATCH = adminRoute<{ id: string }>(async ({ request, params }) => {
  const id = idParam(params.id);
  const { price, ...input } = await readBody(request, serviceFields.partial());
  const [updated] = await getDb()
    .update(services)
    .set({ ...input, priceCents: price })
    .where(eq(services.id, id))
    .returning();
  if (!updated) throw notFound("Serviço");
  return ok({ service: updated });
});
