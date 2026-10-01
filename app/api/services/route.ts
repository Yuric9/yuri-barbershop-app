import { getDb } from "../../../db";
import { services } from "../../../db/schema";
import { DEFAULT_SERVICES } from "../../../lib/domain/catalog";
import { adminRoute, ok, readBody } from "../../../lib/server/http";
import { serviceFields } from "../../../lib/server/validation";

export const dynamic = "force-dynamic";

export const GET = adminRoute(async () => {
  const db = getDb();
  let rows = await db.select().from(services).orderBy(services.name);
  // Primeiro acesso: cria os serviços padrão da barbearia.
  if (!rows.length) rows = await db.insert(services).values([...DEFAULT_SERVICES]).returning();
  return ok({ services: rows });
});

export const POST = adminRoute(async ({ request }) => {
  const { price, ...input } = await readBody(request, serviceFields.partial({ active: true }));
  const [created] = await getDb()
    .insert(services)
    .values({ ...input, priceCents: price, active: input.active ?? true })
    .returning();
  return ok({ service: created }, 201);
});
