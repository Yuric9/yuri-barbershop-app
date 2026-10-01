import { z } from "zod";
import { getDb } from "../../../../db";
import { uniqueContacts } from "../../../../lib/domain/contacts";
import { upsertClientByPhone } from "../../../../lib/server/clients";
import { adminRoute, ApiError, ok, readBody } from "../../../../lib/server/http";

export const dynamic = "force-dynamic";

const importInput = z.object({
  contacts: z.array(z.object({ name: z.string(), phone: z.string() })).max(500, "Importe no máximo 500 contatos por vez."),
});

export const POST = adminRoute(async ({ request }) => {
  const { contacts } = await readBody(request, importInput);
  const valid = uniqueContacts(contacts);
  if (!valid.length) throw new ApiError(400, "Nenhum contato com nome e telefone válido foi encontrado.");
  const db = getDb();
  const now = new Date().toISOString();
  let created = 0;
  for (const contact of valid) {
    if ((await upsertClientByPhone(db, contact, now)).created) created++;
  }
  return ok({ imported: valid.length, created, updated: valid.length - created });
});
