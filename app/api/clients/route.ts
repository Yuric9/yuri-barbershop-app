import { getDb } from "../../../db";
import { todayKey } from "../../../lib/domain/dates";
import { listClientSummaries, upsertClientByPhone } from "../../../lib/server/clients";
import { adminRoute, ok, readBody } from "../../../lib/server/http";
import { clientFields } from "../../../lib/server/validation";

export const dynamic = "force-dynamic";

export const GET = adminRoute(async () => {
  return ok({ clients: await listClientSummaries(getDb(), todayKey()) });
});

/** Cadastro rápido: se o telefone já existir, atualiza o cliente existente. */
export const POST = adminRoute(async ({ request }) => {
  const input = await readBody(request, clientFields);
  const client = await upsertClientByPhone(getDb(), input, new Date().toISOString());
  return ok({ client }, client.created ? 201 : 200);
});
