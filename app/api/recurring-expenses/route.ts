import { asc, isNotNull } from "drizzle-orm";
import { getDb } from "../../../db";
import { recurringExpenses, transactions } from "../../../db/schema";
import { todayKey } from "../../../lib/domain/dates";
import { recurringStatus } from "../../../lib/domain/recurring";
import { adminRoute, ok, readBody } from "../../../lib/server/http";
import { recurringExpenseFields } from "../../../lib/server/validation";

export const dynamic = "force-dynamic";

/** Despesas fixas ativas e se já foram lançadas neste mês. */
export const GET = adminRoute(async () => {
  const db = getDb();
  const month = todayKey().slice(0, 7);
  const [rows, launched] = await Promise.all([
    db.select().from(recurringExpenses).orderBy(asc(recurringExpenses.dayOfMonth)),
    db
      .select({ recurringExpenseId: transactions.recurringExpenseId, date: transactions.date })
      .from(transactions)
      .where(isNotNull(transactions.recurringExpenseId)),
  ]);
  return ok({ expenses: recurringStatus(rows, launched.filter((item) => item.date.startsWith(month)), todayKey()) });
});

export const POST = adminRoute(async ({ request }) => {
  const input = await readBody(request, recurringExpenseFields);
  const [created] = await getDb()
    .insert(recurringExpenses)
    .values({ description: input.description, amountCents: input.amount, category: input.category ?? "", dayOfMonth: input.dayOfMonth, active: true, createdAt: new Date().toISOString() })
    .returning();
  return ok({ expense: created }, 201);
});

