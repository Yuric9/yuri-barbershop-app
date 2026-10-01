import { drizzle } from "drizzle-orm/d1";
import * as productOrderSchema from "./product-order-schema";
import * as schema from "./schema";

/**
 * Conexão com o banco D1. O binding é injetado pelo Worker a cada requisição
 * (ver `worker/index.ts`).
 */
export function getDb() {
  const binding = (globalThis as typeof globalThis & { __YURI_DB?: D1Database }).__YURI_DB;
  if (!binding) throw new Error("Banco de dados D1 indisponível: o binding `DB` não foi configurado.");
  return drizzle(binding, { schema: { ...schema, ...productOrderSchema } });
}

export type Database = ReturnType<typeof getDb>;
