import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../../db";
import { productOrders } from "../../../../db/product-order-schema";
import { PAYMENT_METHODS } from "../../../../lib/domain/catalog";
import { adminRoute, idParam, notFound, ok, readBody } from "../../../../lib/server/http";
import { finalizeOrder } from "../../../../lib/server/product-orders";

export const dynamic = "force-dynamic";

const orderAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("finalize"), paymentMethod: z.enum(PAYMENT_METHODS) }),
  z.object({ action: z.literal("cancel") }),
]);

export const PATCH = adminRoute<{ id: string }>(async ({ request, params }) => {
  const id = idParam(params.id);
  const input = await readBody(request, orderAction);
  const db = getDb();
  const [order] = await db
    .select()
    .from(productOrders)
    .where(and(eq(productOrders.id, id), eq(productOrders.status, "Pendente")))
    .limit(1);
  if (!order) throw notFound("Pedido pendente");

  if (input.action === "cancel") {
    await db.update(productOrders).set({ status: "Cancelado", completedAt: new Date().toISOString() }).where(eq(productOrders.id, id));
  } else {
    await finalizeOrder(db, order, input.paymentMethod);
  }
  return ok({ ok: true });
});
