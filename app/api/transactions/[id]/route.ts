import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { transactions } from "../../../../db/schema";
import { todayKey } from "../../../../lib/domain/dates";
import { adminRoute, ApiError, idParam, notFound, ok, readBody } from "../../../../lib/server/http";
import { resolveLinks, transactionInput } from "../../../../lib/server/transactions";

export const dynamic = "force-dynamic";

async function findTransaction(id: number) {
  const [current] = await getDb().select().from(transactions).where(eq(transactions.id, id)).limit(1);
  if (!current) throw notFound("Lançamento");
  return current;
}

export const PATCH = adminRoute<{ id: string }>(async ({ request, params }) => {
  const current = await findTransaction(idParam(params.id));
  const input = await readBody(request, transactionInput.omit({ month: true }));
  const date = input.date ?? current.date;
  if (date > todayKey()) throw new ApiError(400, "Não é possível lançar valores em datas futuras.");
  const links = await resolveLinks(input.clientEmail, input.serviceId);
  const [updated] = await getDb()
    .update(transactions)
    .set({
      kind: input.kind,
      amountCents: input.amount,
      date,
      description: input.description || current.description,
      paymentMethod: input.paymentMethod,
      ...links,
    })
    .where(eq(transactions.id, current.id))
    .returning();
  return ok({ transaction: updated });
});

/** Apenas lançamentos manuais podem ser excluídos; os de atendimentos ficam vinculados à agenda. */
export const DELETE = adminRoute<{ id: string }>(async ({ params }) => {
  const current = await findTransaction(idParam(params.id));
  if (current.appointmentId) {
    throw new ApiError(409, "Este lançamento pertence a um atendimento da agenda e não pode ser excluído.");
  }
  await getDb().delete(transactions).where(eq(transactions.id, current.id));
  return ok({ ok: true });
});
