/**
 * Cálculos financeiros do caixa e dos relatórios.
 */
import { addDays, MONTH_NAMES } from "./dates.ts";

export type TransactionKind = "entrada" | "despesa";

export type FinanceTransaction = {
  id: number;
  kind: string;
  amountCents: number;
  date: string;
  appointmentId?: number | null;
  serviceId?: number | null;
};

export type FinanceAppointment = {
  id: number;
  date: string;
  status: string;
  totalCents: number;
  cashTransactionId?: number | null;
};

export function isIncome(transaction: { kind: string }) {
  return transaction.kind.toLowerCase() === "entrada";
}

export function signedAmount(transaction: { kind: string; amountCents: number }) {
  return isIncome(transaction) ? transaction.amountCents : -transaction.amountCents;
}

export function totals(transactions: FinanceTransaction[]) {
  let income = 0;
  let expenses = 0;
  for (const transaction of transactions) {
    if (isIncome(transaction)) income += transaction.amountCents;
    else expenses += transaction.amountCents;
  }
  return { income, expenses, balance: income - expenses };
}

export function inPeriod<T extends { date: string }>(transactions: T[], prefix: string) {
  return transactions.filter((transaction) => transaction.date.startsWith(prefix));
}

export type MonthSummary = { month: number; name: string; income: number; expenses: number; balance: number };

export function monthlySummaries(transactions: FinanceTransaction[], year: number): MonthSummary[] {
  return MONTH_NAMES.map((name, index) => {
    const prefix = `${year}-${String(index + 1).padStart(2, "0")}`;
    return { month: index + 1, name, ...totals(inPeriod(transactions, prefix)) };
  });
}

/** Faturamento (entradas) de cada um dos últimos `days` dias, terminando em `today`. */
export function dailyIncome(transactions: FinanceTransaction[], today: string, days = 7) {
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(today, index - (days - 1));
    const income = transactions
      .filter((transaction) => transaction.date === date && isIncome(transaction))
      .reduce((sum, transaction) => sum + transaction.amountCents, 0);
    return { date, income };
  });
}

/**
 * Atendimentos concluídos no dia.
 *
 * Uma entrada no caixa vinculada a um serviço ou a um agendamento representa
 * um atendimento realizado (finalização de agendamento, atendimento avulso ou
 * lançamento manual de serviço). Vendas de produtos não contam. Atendimentos
 * antigos finalizados sem lançamento vinculado também são contados.
 */
export function completedServices(transactions: FinanceTransaction[], appointments: FinanceAppointment[], date: string) {
  const serviceEntries = transactions.filter(
    (transaction) =>
      transaction.date === date && isIncome(transaction) && Boolean(transaction.serviceId || transaction.appointmentId),
  );
  const linkedAppointments = new Set(serviceEntries.map((entry) => entry.appointmentId).filter(Boolean));
  const linkedTransactions = new Set(serviceEntries.map((entry) => entry.id));
  const legacy = appointments.filter(
    (appointment) =>
      appointment.date === date &&
      appointment.status === "Finalizado" &&
      !linkedAppointments.has(appointment.id) &&
      !(appointment.cashTransactionId && linkedTransactions.has(appointment.cashTransactionId)),
  );
  const count = serviceEntries.length + legacy.length;
  const revenue =
    serviceEntries.reduce((sum, entry) => sum + entry.amountCents, 0) +
    legacy.reduce((sum, appointment) => sum + appointment.totalCents, 0);
  return { count, revenue, averageTicket: count ? Math.round(revenue / count) : 0 };
}
