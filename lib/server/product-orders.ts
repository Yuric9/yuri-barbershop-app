import { and, eq, gte, inArray, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { productOrderItems, productOrders } from "../../db/product-order-schema";
import { products, transactions } from "../../db/schema";
import { todayKey } from "../domain/dates";
import { ApiError } from "./http";

type Order = typeof productOrders.$inferSelect;

/**
 * Finaliza um pedido: baixa o estoque e lança a venda no caixa.
 * A baixa só acontece se houver estoque suficiente para todos os itens.
 */
export async function finalizeOrder(db: Database, order: Order, paymentMethod: string) {
  const items = await db.select().from(productOrderItems).where(eq(productOrderItems.orderId, order.id));
  if (!items.length) throw new ApiError(409, "O pedido não possui itens.");

  const stock = await db.select().from(products).where(inArray(products.id, items.map((item) => item.productId)));
  for (const item of items) {
    const product = stock.find((row) => row.id === item.productId);
    if (!product || product.stock < item.quantity) {
      throw new ApiError(409, `Estoque insuficiente para ${item.productName}. Atualize o estoque antes de finalizar.`);
    }
  }

  const now = new Date().toISOString();
  // Atualizações condicionais em lote: nenhuma baixa deixa o estoque negativo.
  await db.batch([
    db.update(productOrders).set({ status: "Finalizado", paymentMethod, completedAt: now }).where(eq(productOrders.id, order.id)),
    ...items.map((item) =>
      db
        .update(products)
        .set({ stock: sql`${products.stock} - ${item.quantity}` })
        .where(and(eq(products.id, item.productId), gte(products.stock, item.quantity))),
    ),
    db.insert(transactions).values({
      kind: "entrada",
      description: `Venda de produtos — ${order.clientName} (${items.map((item) => `${item.quantity}x ${item.productName}`).join(", ")})`,
      amountCents: order.totalCents,
      date: todayKey(),
      clientEmail: order.clientEmail,
      clientName: order.clientName,
      paymentMethod,
      createdAt: now,
    }),
  ]);
}
