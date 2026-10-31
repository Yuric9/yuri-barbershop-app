/**
 * `INSERT ... SELECT ... WHERE`: grava a linha somente se a condição for
 * verdadeira no momento em que o banco executa o comando.
 *
 * Serve para lotes (`db.batch`), em que não dá para consultar o banco no meio
 * do caminho: por exemplo, "lance no caixa só se o agendamento ainda não foi
 * finalizado". Colunas não informadas recebem o valor padrão do schema.
 */
import { getTableColumns, sql, type SQL } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import type { Database } from "../../db";

export function insertWhen<T extends SQLiteTable>(db: Database, table: T, values: T["$inferInsert"], condition: SQL | undefined) {
  const given = values as Record<string, unknown>;
  const row = Object.entries(getTableColumns(table)).map(([key, column]) => {
    const value = key in given ? given[key] : column.hasDefault ? column.default : null;
    return value === undefined || value === null ? sql`null` : sql`${column.mapToDriverValue(value)}`;
  });
  return db.insert(table).select(sql`select ${sql.join(row, sql`, `)} where ${condition}`);
}
