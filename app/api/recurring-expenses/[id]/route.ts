import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../../db";
import { recurringExpenses } from "../../../../db/schema";
import { adminRoute, idParam, notFound, ok, readBody } from "../../../../lib/server/http";
import { recurringExpenseFields } from "../../../../lib/server/validation";

export const dynamic = "force-dynamic";

/** Edita ou desativa (active: false) uma despesa fixa. Os lançamentos já feitos não mudam. */
export const PATCH = adminRoute<{ id: string }>(async ({ request, params }) => {
  const { amount, ...input } = await readBody(request, recurringExpenseFields.partial().extend({ active: z.boolean().optional() }));
  const [updated] = await getDb()
    .update(recurringExpenses)
    .set({ ...input, amountCents: amount })
    .where(eq(recurringExpenses.id, idParam(params.id)))
    .returning();
  if (!updated) throw notFound("Despesa fixa");
  return ok({ expense: updated });
});
