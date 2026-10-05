import { eq } from "drizzle-orm";
import { z } from "zod";
import { isMonthKey } from "../domain/dates";
import { getDb } from "../../db";
import { profiles, services } from "../../db/schema";
import { ApiError } from "./http";
import { dateKey, moneyCents, optionalId, optionalText, transactionKind } from "./validation";

export const transactionInput = z.object({
  kind: transactionKind,
  amount: moneyCents,
  /** Dia do lançamento. Para o fechamento de um mês inteiro, use `month`. */
  date: dateKey.optional(),
  month: z.string().refine(isMonthKey, "Mês inválido.").optional(),
  description: optionalText(240),
  clientEmail: z.string().trim().toLowerCase().optional().default(""),
  serviceId: optionalId,
  paymentMethod: optionalText(40),
});

/** Busca cliente e serviço vinculados (opcionais) para gravar os nomes junto. */
export async function resolveLinks(clientEmail: string, serviceId: number | null) {
  const db = getDb();
  const [client] = clientEmail ? await db.select().from(profiles).where(eq(profiles.email, clientEmail)).limit(1) : [];
  const [service] = serviceId ? await db.select().from(services).where(eq(services.id, serviceId)).limit(1) : [];
  if (clientEmail && !client) throw new ApiError(400, "Cliente não encontrado.");
  if (serviceId && !service) throw new ApiError(400, "Serviço não encontrado.");
  return {
    clientEmail: client?.email ?? "",
    clientName: client?.name ?? "",
    serviceId: service?.id ?? null,
    serviceName: service?.name ?? "",
  };
}
