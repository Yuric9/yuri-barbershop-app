import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../../../db";
import { appointments, profiles } from "../../../../../db/schema";
import { loyaltyAdjustmentFor } from "../../../../../lib/domain/loyalty";
import { getClient, isPaidVisit } from "../../../../../lib/server/clients";
import { adminRoute, ok, readBody } from "../../../../../lib/server/http";
import { text } from "../../../../../lib/server/validation";

export const dynamic = "force-dynamic";

const adjustment = z.object({
  /** Total de atendimentos válidos que o cartão deve passar a ter. */
  targetCount: z.coerce.number().int().min(0, "A quantidade não pode ser negativa.").max(10_000),
  note: text("o motivo do ajuste", 240),
});

/** Corrige manualmente a contagem do cartão fidelidade (ex.: atendimentos antigos). */
export const POST = adminRoute<{ email: string }>(async ({ request, params, user }) => {
  const db = getDb();
  const client = await getClient(db, decodeURIComponent(params.email));
  const { targetCount, note } = await readBody(request, adjustment);
  const history = await db.select().from(appointments).where(eq(appointments.clientEmail, client.email));
  await db
    .update(profiles)
    .set({
      loyaltyAdjustment: loyaltyAdjustmentFor(targetCount, history.filter(isPaidVisit).length),
      loyaltyAdjustmentNote: note,
      loyaltyUpdatedAt: new Date().toISOString(),
      loyaltyUpdatedBy: user.email,
    })
    .where(eq(profiles.email, client.email));
  return ok({ ok: true });
});
