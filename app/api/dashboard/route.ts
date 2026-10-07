import { eq, gte, isNotNull, max } from "drizzle-orm";
import { getDb } from "../../../db";
import { productOrders } from "../../../db/product-order-schema";
import { recurringExpenses, transactions } from "../../../db/schema";
import { addDays, daysBetween, sameDayPreviousMonth, startOfWeek, todayKey } from "../../../lib/domain/dates";
import { dailyIncome, inPeriod, periodStats, serviceRanking, totals } from "../../../lib/domain/finance";
import { recurringStatus } from "../../../lib/domain/recurring";
import { adminRoute, ok } from "../../../lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Indicadores da tela inicial: atendimentos e faturamento (hoje, semana e
 * mês, comparados com o mesmo período do mês anterior), serviços mais
 * feitos, despesas fixas pendentes e lembrete de gastos.
 */
export const GET = adminRoute(async () => {
  const db = getDb();
  const today = todayKey();
  const monthStart = `${today.slice(0, 7)}-01`;
  const previousSameDay = sameDayPreviousMonth(today);
  const previousMonthStart = `${previousSameDay.slice(0, 7)}-01`;
  const weekStart = startOfWeek(today);
  const since = [previousMonthStart, weekStart, addDays(today, -6)].sort()[0];

  const [rows, lastExpense, recurring, launched, pendingOrders] = await Promise.all([
    db.select().from(transactions).where(gte(transactions.date, since)),
    // Último gasto de todos os tempos (pode ser anterior ao período carregado).
    db.select({ date: max(transactions.date) }).from(transactions).where(eq(transactions.kind, "despesa")),
    db.select().from(recurringExpenses),
    db
      .select({ recurringExpenseId: transactions.recurringExpenseId, date: transactions.date })
      .from(transactions)
      .where(isNotNull(transactions.recurringExpenseId)),
    db.select({ id: productOrders.id }).from(productOrders).where(eq(productOrders.status, "Pendente")),
  ]);

  const month = periodStats(rows, monthStart, today);
  const previousMonth = periodStats(rows, previousMonthStart, previousSameDay);

  return ok({
    today,
    day: periodStats(rows, today, today),
    week: periodStats(rows, weekStart, today),
    month,
    previousMonth,
    monthTotals: totals(inPeriod(rows, today.slice(0, 7))),
    ranking: serviceRanking(rows, monthStart, today),
    lastSevenDays: dailyIncome(rows, today, 7),
    recurring: recurringStatus(recurring, launched, today).filter((item) => !item.launched),
    daysSinceLastExpense: lastExpense[0]?.date ? daysBetween(lastExpense[0].date, today) : null,
    pendingOrders: pendingOrders.length,
  });
});
