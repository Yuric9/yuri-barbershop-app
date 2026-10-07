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

type ServiceEntry = FinanceTransaction & { serviceName?: string | null };

/** Entrada que representa um atendimento (vinculada a serviço ou agendamento). */
export function isServiceEntry(transaction: FinanceTransaction) {
  return isIncome(transaction) && Boolean(transaction.serviceId || transaction.appointmentId);
}

/** Atendimentos e faturamento entre duas datas (inclusive). */
export function periodStats(transactions: FinanceTransaction[], from: string, to: string) {
  const rows = transactions.filter((item) => item.date >= from && item.date <= to);
  const income = rows.filter(isIncome).reduce((sum, item) => sum + item.amountCents, 0);
  const services = rows.filter(isServiceEntry).length;
  return { services, income, averageTicket: services ? Math.round(rows.filter(isServiceEntry).reduce((sum, item) => sum + item.amountCents, 0) / services) : 0 };
}

/** Quantidade e valor de cada serviço no período, do mais feito ao menos feito. */
export function serviceRanking(transactions: ServiceEntry[], from: string, to: string) {
  const groups = new Map<string, { name: string; count: number; amountCents: number }>();
  for (const item of transactions) {
    if (item.date < from || item.date > to || !isServiceEntry(item)) continue;
    const name = item.serviceName?.trim() || "Outros";
    const group = groups.get(name) ?? { name, count: 0, amountCents: 0 };
    group.count++;
    group.amountCents += item.amountCents;
    groups.set(name, group);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || b.amountCents - a.amountCents);
}

/** Variação percentual (arredondada); `null` quando não há base de comparação. */
export function percentChange(current: number, previous: number) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Gastos agrupados por categoria, do maior para o menor. */
export function expensesByCategory(transactions: (FinanceTransaction & { category?: string | null })[], fallback: string) {
  const groups = new Map<string, number>();
  for (const item of transactions) {
    if (isIncome(item)) continue;
    const category = item.category?.trim() || fallback;
    groups.set(category, (groups.get(category) ?? 0) + item.amountCents);
  }
  return [...groups.entries()].map(([category, amountCents]) => ({ category, amountCents })).sort((a, b) => b.amountCents - a.amountCents);
}
