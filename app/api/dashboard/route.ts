import { and, asc, eq, gte, ne } from "drizzle-orm";
import { getDb } from "../../../db";
import { productOrders } from "../../../db/product-order-schema";
import { appointments, transactions } from "../../../db/schema";
import { addDays, todayKey } from "../../../lib/domain/dates";
import { completedServices, dailyIncome, inPeriod, totals } from "../../../lib/domain/finance";
import { adminRoute, ok } from "../../../lib/server/http";

export const dynamic = "force-dynamic";

/** Indicadores da tela inicial, calculados no servidor. */
export const GET = adminRoute(async () => {
  const db = getDb();
  const today = todayKey();
  const monthStart = `${today.slice(0, 7)}-01`;
  const since = monthStart < addDays(today, -6) ? monthStart : addDays(today, -6);

  const [recentTransactions, todayAppointments, upcoming, pendingOrders] = await Promise.all([
    db.select().from(transactions).where(gte(transactions.date, since)),
    db.select().from(appointments).where(eq(appointments.date, today)),
    db
      .select()
      .from(appointments)
      .where(and(gte(appointments.date, today), ne(appointments.status, "Cancelado"), ne(appointments.status, "Finalizado")))
      .orderBy(asc(appointments.date), asc(appointments.time))
      .limit(6),
    db.select({ id: productOrders.id }).from(productOrders).where(eq(productOrders.status, "Pendente")),
  ]);

  const todayTransactions = inPeriod(recentTransactions, today);
  const activeToday = todayAppointments.filter((item) => item.status !== "Cancelado");

  return ok({
    today,
    todayIncomeCents: totals(todayTransactions).income,
    completedToday: completedServices(todayTransactions, todayAppointments, today),
    scheduledToday: activeToday.length,
    pendingToday: activeToday.filter((item) => item.status === "Pendente").length,
    month: totals(inPeriod(recentTransactions, today.slice(0, 7))),
    lastSevenDays: dailyIncome(recentTransactions, today, 7),
    upcoming,
    pendingOrders: pendingOrders.length,
  });
});
