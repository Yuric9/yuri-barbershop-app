import { and, desc, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { transactions } from "../../../db/schema";
import { monthRange, todayKey } from "../../../lib/domain/dates";
import { adminRoute, ApiError, ok, readBody } from "../../../lib/server/http";
import { resolveLinks, transactionInput } from "../../../lib/server/transactions";

export const dynamic = "force-dynamic";

/** Lançamentos de um ano (padrão: ano atual). */
export const GET = adminRoute(async ({ request }) => {
  const year = z.coerce.number().int().min(2000).max(2100).catch(Number(todayKey().slice(0, 4)))
    .parse(new URL(request.url).searchParams.get("year"));
  const rows = await getDb()
    .select()
    .from(transactions)
    .where(and(gte(transactions.date, `${year}-01-01`), lte(transactions.date, `${year}-12-31`)))
    .orderBy(desc(transactions.date), desc(transactions.id));
  return ok({ transactions: rows });
});

export const POST = adminRoute(async ({ request }) => {
  const input = await readBody(request, transactionInput);
  const today = todayKey();
  const date = input.month ? monthRange(input.month).start : input.date ?? today;
  if (date > today) throw new ApiError(400, "Não é possível lançar valores em datas futuras.");

  const links = await resolveLinks(input.clientEmail, input.serviceId);
  const fallback = input.month
    ? `${input.kind === "entrada" ? "Faturamento" : "Despesas"} consolidadas de ${input.month}`
    : links.serviceName || (input.kind === "entrada" ? "Entrada" : "Despesa");
  const [created] = await getDb()
    .insert(transactions)
    .values({
      kind: input.kind,
      description: input.description || fallback,
      amountCents: input.amount,
      date,
      ...links,
      paymentMethod: input.paymentMethod,
      category: input.kind === "despesa" ? input.category : "",
      createdAt: new Date().toISOString(),
    })
    .returning();
  return ok({ transaction: created }, 201);
});
