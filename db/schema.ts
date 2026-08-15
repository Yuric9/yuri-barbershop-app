import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
  email: text("email").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  birthDate: text("birth_date").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const accounts = sqliteTable("accounts", {
  email: text("email").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("client"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const authSessions = sqliteTable("auth_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  accountEmail: text("account_email").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const services = sqliteTable("services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  priceCents: integer("price_cents").notNull(),
  durationMin: integer("duration_min").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  priceCents: integer("price_cents").notNull(),
  stock: integer("stock").notNull().default(0),
  imageKey: text("image_key").notNull().default(""),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  showOnLogin: integer("show_on_login", { mode: "boolean" }).notNull().default(false),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const promotions = sqliteTable("promotions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  validUntil: text("valid_until").notNull().default(""),
  imageKey: text("image_key").notNull().default(""),
  showOnLogin: integer("show_on_login", { mode: "boolean" }).notNull().default(false),
  audience: text("audience").notNull().default("Todos"),
  views: integer("views").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const subscriptionCampaigns = sqliteTable("subscription_campaigns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  imageKey: text("image_key").notNull().default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  showOnLogin: integer("show_on_login", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});

export const catalogItems = sqliteTable("catalog_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
  imageKey: text("image_key").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const subscriptions = sqliteTable("subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientEmail: text("client_email").notNull(),
  clientName: text("client_name").notNull(),
  status: text("status").notNull().default("Aguardando pagamento"),
  priceCents: integer("price_cents").notNull().default(12000),
  startDate: text("start_date").notNull().default(""),
  endDate: text("end_date").notNull().default(""),
  adminMessage: text("admin_message").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const appointments = sqliteTable("appointments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientEmail: text("client_email").notNull(),
  clientName: text("client_name").notNull(),
  serviceId: integer("service_id").notNull(),
  serviceName: text("service_name").notNull(),
  productId: integer("product_id"),
  productName: text("product_name"),
  date: text("date").notNull(),
  time: text("time").notNull(),
  status: text("status").notNull().default("Pendente"),
  adminMessage: text("admin_message").notNull().default(""),
  totalCents: integer("total_cents").notNull(),
  collaboratorId: integer("collaborator_id"),
  collaboratorName: text("collaborator_name").notNull().default(""),
  paymentMethod: text("payment_method").notNull().default(""),
  commissionPercent: integer("commission_percent").notNull().default(0),
  commissionCents: integer("commission_cents").notNull().default(0),
  cashTransactionId: integer("cash_transaction_id"),
  createdAt: text("created_at").notNull(),
});

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind").notNull(),
  description: text("description").notNull(),
  amountCents: integer("amount_cents").notNull(),
  date: text("date").notNull(),
  appointmentId: integer("appointment_id"),
  collaboratorId: integer("collaborator_id"),
  paymentMethod: text("payment_method").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const collaborators = sqliteTable("collaborators", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  defaultCommissionPercent: integer("default_commission_percent").notNull().default(40),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  owner: integer("owner", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});

export const collaboratorServices = sqliteTable("collaborator_services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  collaboratorId: integer("collaborator_id").notNull(),
  serviceId: integer("service_id").notNull(),
  commissionPercent: integer("commission_percent"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const commissionSettlements = sqliteTable("commission_settlements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  collaboratorId: integer("collaborator_id").notNull(),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  amountCents: integer("amount_cents").notNull(),
  status: text("status").notNull().default("Pago"),
  note: text("note").notNull().default(""),
  paidAt: text("paid_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  senderEmail: text("sender_email").notNull(),
  senderName: text("sender_name").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});

export const reviews = sqliteTable("reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientEmail: text("client_email").notNull(),
  clientName: text("client_name").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const waitlist = sqliteTable("waitlist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientEmail: text("client_email").notNull(),
  clientName: text("client_name").notNull(),
  serviceName: text("service_name").notNull(),
  preferredDate: text("preferred_date").notNull(),
  preferredTime: text("preferred_time").notNull(),
  status: text("status").notNull().default("Aguardando"),
  createdAt: text("created_at").notNull(),
});

export const scheduleBlocks = sqliteTable("schedule_blocks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  time: text("time").notNull().default("Dia inteiro"),
  reason: text("reason").notNull(),
  collaboratorId: integer("collaborator_id"),
  createdAt: text("created_at").notNull(),
});

export const businessSettings = sqliteTable("business_settings", {
  id: integer("id").primaryKey().default(1),
  monthlyGoalCents: integer("monthly_goal_cents").notNull().default(500000),
  loyaltyTarget: integer("loyalty_target").notNull().default(10),
  loyaltyReward: text("loyalty_reward").notNull().default("1 atendimento grátis"),
});

export const marketingContacts = sqliteTable("marketing_contacts", {
  key: text("key").primaryKey(),
  clientEmail: text("client_email").notNull(),
  campaign: text("campaign").notNull(),
  sentAt: text("sent_at").notNull().default(""),
  answered: integer("answered", { mode: "boolean" }).notNull().default(false),
  returned: integer("returned", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull(),
});

export const authAttempts = sqliteTable("auth_attempts", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: text("window_start").notNull(),
  blockedUntil: text("blocked_until").notNull().default(""),
});
