import { and, eq, like } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../../../db";
import { recurringExpenses, transactions } from "../../../../../db/schema";
import { todayKey } from "../../../../../lib/domain/dates";
import { launchDateFor } from "../../../../../lib/domain/recurring";
import { adminRoute, ApiError, idParam, notFound, ok, readBody } from "../../../../../lib/server/http";
import { moneyCents } from "../../../../../lib/server/validation";

export const dynamic = "force-dynamic";

/** Lança a despesa fixa no mês atual (uma vez por mês). O valor pode ser ajustado. */
export const POST = adminRoute<{ id: string }>(async ({ request, params }) => {
  const db = getDb();
  const [expense] = await db.select().from(recurringExpenses).where(eq(recurringExpenses.id, idParam(params.id))).limit(1);
  if (!expense || !expense.active) throw notFound("Despesa fixa");

  const { amount } = await readBody(request, z.object({ amount: moneyCents.optional() }));
  const today = todayKey();
  const [already] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.recurringExpenseId, expense.id), like(transactions.date, `${today.slice(0, 7)}-%`)))
    .limit(1);
  if (already) throw new ApiError(409, `${expense.description} já foi lançado neste mês.`);

  const [created] = await db
    .insert(transactions)
    .values({
      kind: "despesa",
      description: expense.description,
      amountCents: amount ?? expense.amountCents,
      date: launchDateFor(expense.dayOfMonth, today),
      category: expense.category,
      recurringExpenseId: expense.id,
      createdAt: new Date().toISOString(),
    })
    .returning();
  return ok({ transaction: created }, 201);
});
