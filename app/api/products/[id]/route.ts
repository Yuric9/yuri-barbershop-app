import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { products } from "../../../../db/schema";
import { adminRoute, idParam, notFound, ok, readBody } from "../../../../lib/server/http";
import { productFields } from "../../../../lib/server/validation";

export const dynamic = "force-dynamic";

export const PATCH = adminRoute<{ id: string }>(async ({ request, params }) => {
  const id = idParam(params.id);
  const { price, imageKey, ...input } = await readBody(request, productFields.partial());
  const [updated] = await getDb()
    .update(products)
    // Sem nova foto, mantém a imagem atual.
    .set({ ...input, priceCents: price, ...(imageKey ? { imageKey } : {}) })
    .where(eq(products.id, id))
    .returning();
  if (!updated) throw notFound("Produto");
  return ok({ product: updated });
});
