import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const productOrders = sqliteTable("product_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientEmail: text("client_email").notNull().default(""),
  clientName: text("client_name").notNull(),
  phone: text("phone").notNull().default(""),
  status: text("status").notNull().default("Pendente"),
  totalCents: integer("total_cents").notNull(),
  paymentMethod: text("payment_method").notNull().default(""),
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at").notNull().default(""),
});

export const productOrderItems = sqliteTable("product_order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  priceCents: integer("price_cents").notNull(),
});
