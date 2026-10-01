import { getDb } from "../../../db";
import { products } from "../../../db/schema";
import { adminRoute, ok, readBody } from "../../../lib/server/http";
import { productFields } from "../../../lib/server/validation";

export const dynamic = "force-dynamic";

export const GET = adminRoute(async () => {
  const rows = await getDb().select().from(products).orderBy(products.name);
  return ok({ products: rows });
});

export const POST = adminRoute(async ({ request }) => {
  const { price, ...input } = await readBody(
    request,
    productFields.partial({ description: true, imageKey: true, active: true }),
  );
  const [created] = await getDb()
    .insert(products)
    .values({ ...input, priceCents: price, active: input.active ?? true })
    .returning();
  return ok({ product: created }, 201);
});
