/** Tipos dos dados recebidos da API (derivados do schema do banco). */
import type { productOrderItems, productOrders } from "../../db/product-order-schema";
import type { appointments, collaborators, marketingContacts, products, recurringExpenses, services, transactions } from "../../db/schema";
import type { ClientSummary } from "../server/clients";

export type { ClientSummary };
export type Appointment = typeof appointments.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type MarketingContact = typeof marketingContacts.$inferSelect;
export type ProductOrder = typeof productOrders.$inferSelect & { items: (typeof productOrderItems.$inferSelect)[] };

export type Collaborator = typeof collaborators.$inferSelect & {
  commissions: { serviceId: number; percent: number }[];
  stats: {
    finalizedCount: number;
    monthCount: number;
    monthRevenueCents: number;
    monthCommissionCents: number;
    totalCommissionCents: number;
  };
};

export type PeriodStats = { services: number; income: number; averageTicket: number };

export type RecurringExpense = typeof recurringExpenses.$inferSelect & { launched: boolean; due: boolean };

export type Dashboard = {
  today: string;
  day: PeriodStats;
  week: PeriodStats;
  month: PeriodStats;
  /** Mesmo período (dia 1 até hoje) do mês anterior. */
  previousMonth: PeriodStats;
  monthTotals: { income: number; expenses: number; balance: number };
  ranking: { name: string; count: number; amountCents: number }[];
  lastSevenDays: { date: string; income: number }[];
  recurring: RecurringExpense[];
  daysSinceLastExpense: number | null;
  pendingOrders: number;
};
