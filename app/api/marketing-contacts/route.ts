import { z } from "zod";
import { getDb } from "../../../db";
import { marketingContacts } from "../../../db/schema";
import { adminRoute, ok, readBody } from "../../../lib/server/http";

export const dynamic = "force-dynamic";

export const GET = adminRoute(async () => {
  return ok({ contacts: await getDb().select().from(marketingContacts) });
});

const contactInput = z.object({
  key: z.string().trim().min(1).max(300),
  clientEmail: z.string().trim().toLowerCase().min(1),
  campaign: z.string().trim().min(1).max(40),
  sentAt: z.string().max(40).optional().default(""),
  answered: z.boolean().optional().default(false),
  returned: z.boolean().optional().default(false),
});

/** Registra o acompanhamento de uma mensagem de remarketing (enviada, respondeu, voltou). */
export const PUT = adminRoute(async ({ request }) => {
  const input = await readBody(request, contactInput);
  const values = { ...input, updatedAt: new Date().toISOString() };
  await getDb()
    .insert(marketingContacts)
    .values(values)
    .onConflictDoUpdate({
      target: marketingContacts.key,
      set: { sentAt: values.sentAt, answered: values.answered, returned: values.returned, updatedAt: values.updatedAt },
    });
  return ok({ ok: true });
});
