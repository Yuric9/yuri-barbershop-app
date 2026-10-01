/** Tipos dos dados recebidos da API (derivados do schema do banco). */
import type { productOrderItems, productOrders } from "../../db/product-order-schema";
import type { appointments, collaborators, marketingContacts, products, services, transactions } from "../../db/schema";
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

export type Dashboard = {
  today: string;
  todayIncomeCents: number;
  completedToday: { count: number; revenue: number; averageTicket: number };
  scheduledToday: number;
  pendingToday: number;
  month: { income: number; expenses: number; balance: number };
  lastSevenDays: { date: string; income: number }[];
  upcoming: Appointment[];
  pendingOrders: number;
};
