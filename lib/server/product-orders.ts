import { and, eq, exists, inArray, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { productOrderItems, productOrders } from "../../db/product-order-schema";
import { products, transactions } from "../../db/schema";
import { todayKey } from "../domain/dates";
import { ApiError } from "./http";
import { insertWhen } from "./insert-when";

type Order = typeof productOrders.$inferSelect;

/** Mensagem da trava de estoque criada na migração `0021_product_stock_guard.sql`. */
const STOCK_GUARD = "estoque_insuficiente";

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
  // Um único lote (`db.batch`): o D1 grava tudo ou nada. Os comandos só agem
  // enquanto o pedido estiver pendente, então um clique repetido não baixa o
  // estoque nem lança no caixa duas vezes. Se alguma baixa deixar o estoque
  // negativo, a trava do banco (migração 0021) cancela o lote inteiro.
  const stillPending = and(eq(productOrders.id, order.id), eq(productOrders.status, "Pendente"));
  const orderIsPending = exists(db.select({ id: productOrders.id }).from(productOrders).where(stillPending));

  let results;
  try {
    results = await db.batch([
      insertWhen(db, transactions, {
        kind: "entrada",
        description: `Venda de produtos — ${order.clientName} (${items.map((item) => `${item.quantity}x ${item.productName}`).join(", ")})`,
        amountCents: order.totalCents,
        date: todayKey(),
        clientEmail: order.clientEmail,
        clientName: order.clientName,
        paymentMethod,
        createdAt: now,
      }, orderIsPending),
      ...items.map((item) =>
        db
          .update(products)
          .set({ stock: sql`${products.stock} - ${item.quantity}` })
          .where(and(eq(products.id, item.productId), orderIsPending)),
      ),
      db
        .update(productOrders)
        .set({ status: "Finalizado", paymentMethod, completedAt: now })
        .where(stillPending)
        .returning({ id: productOrders.id }),
    ]);
  } catch (error) {
    // O erro do banco pode vir embrulhado pelo Drizzle (em `cause`).
    if (`${error} ${(error as { cause?: unknown })?.cause}`.includes(STOCK_GUARD)) {
      throw new ApiError(409, "Estoque insuficiente para um dos produtos. Atualize o estoque antes de finalizar.");
    }
    throw error;
  }
  const finalized = results[results.length - 1] as { id: number }[];
  if (!finalized.length) throw new ApiError(409, "Este pedido já foi finalizado ou cancelado. Atualize a página.");
}
