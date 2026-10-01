import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { profiles } from "../../../../db/schema";
import { assertPhoneAvailable, getClient } from "../../../../lib/server/clients";
import { adminRoute, ok, readBody } from "../../../../lib/server/http";
import { clientFields } from "../../../../lib/server/validation";

export const dynamic = "force-dynamic";

export const PATCH = adminRoute<{ email: string }>(async ({ request, params }) => {
  const db = getDb();
  const client = await getClient(db, decodeURIComponent(params.email));
  const input = await readBody(request, clientFields);
  await assertPhoneAvailable(db, input.phone, client.email);
  await db.update(profiles).set(input).where(eq(profiles.email, client.email));
  return ok({ ok: true });
});
