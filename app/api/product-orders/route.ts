import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { productOrderItems, productOrders } from "../../../db/product-order-schema";
import { products } from "../../../db/schema";
import { PAYMENT_METHODS } from "../../../lib/domain/catalog";
import { getClient } from "../../../lib/server/clients";
import { adminRoute, ApiError, ok, readBody } from "../../../lib/server/http";
import { finalizeOrder } from "../../../lib/server/product-orders";
import { positiveId } from "../../../lib/server/validation";

export const dynamic = "force-dynamic";

/** Pedidos pendentes, com os itens. */
export const GET = adminRoute(async () => {
  const db = getDb();
  const orders = await db.select().from(productOrders).where(eq(productOrders.status, "Pendente")).orderBy(desc(productOrders.id));
  const items = orders.length
    ? await db.select().from(productOrderItems).where(inArray(productOrderItems.orderId, orders.map((order) => order.id)))
    : [];
  return ok({
    orders: orders.map((order) => ({ ...order, items: items.filter((item) => item.orderId === order.id) })),
  });
});

const saleInput = z.object({
  items: z
    .array(z.object({ productId: positiveId, quantity: z.coerce.number().int().min(1).max(999) }))
    .min(1, "Escolha pelo menos um produto.")
    .max(20),
  clientEmail: z.string().trim().toLowerCase().optional().default(""),
  paymentMethod: z.enum(PAYMENT_METHODS),
});

/** Venda no balcão: cria o pedido e já finaliza (baixa o estoque e lança no caixa). */
export const POST = adminRoute(async ({ request }) => {
  const input = await readBody(request, saleInput);
  const db = getDb();
  const quantities = new Map<number, number>();
  for (const item of input.items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);

  const rows = await db
    .select()
    .from(products)
    .where(and(inArray(products.id, [...quantities.keys()]), eq(products.active, true)));
  if (rows.length !== quantities.size) throw new ApiError(409, "Um dos produtos não está mais disponível.");
  for (const product of rows) {
    if ((quantities.get(product.id) ?? 0) > product.stock) throw new ApiError(409, `Estoque insuficiente para ${product.name}.`);
  }

  const client = input.clientEmail ? await getClient(db, input.clientEmail) : null;
  const now = new Date().toISOString();
  const [order] = await db
    .insert(productOrders)
    .values({
      clientEmail: client?.email ?? "",
      clientName: client?.name ?? "Venda no balcão",
      phone: client?.phone ?? "",
      totalCents: rows.reduce((sum, product) => sum + product.priceCents * (quantities.get(product.id) ?? 0), 0),
      createdAt: now,
    })
    .returning();
  await db.insert(productOrderItems).values(
    rows.map((product) => ({
      orderId: order.id,
      productId: product.id,
      productName: product.name,
      quantity: quantities.get(product.id) ?? 0,
      priceCents: product.priceCents,
    })),
  );
  try {
    await finalizeOrder(db, order, input.paymentMethod);
  } catch (error) {
    await db.update(productOrders).set({ status: "Cancelado", completedAt: now }).where(eq(productOrders.id, order.id));
    throw error;
  }
  return ok({ order }, 201);
});
