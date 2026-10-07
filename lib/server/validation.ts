/** Esquemas de validação reutilizados pelas rotas. */
import { z } from "zod";
import { isDateKey } from "../domain/dates";
import { toCents } from "../domain/money";
import { isValidPhone } from "../domain/phone";
import { timeToMinutes } from "../domain/schedule";

export const text = (label: string, max = 120) =>
  z.string({ error: `Informe ${label}.` }).trim().min(1, `Informe ${label}.`).max(max, `${label} muito longo.`);

export const optionalText = (max = 240) => z.string().trim().max(max).optional().default("");

export const phone = z
  .string({ error: "Informe o telefone." })
  .trim()
  .refine(isValidPhone, "Informe um telefone válido com DDD.");

export const email = z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(254);

export const dateKey = z.string().refine(isDateKey, "Informe uma data válida.");

export const optionalDateKey = z
  .string()
  .optional()
  .default("")
  .refine((value) => !value || isDateKey(value), "Informe uma data válida.");

export const time = z.string().refine((value) => Number.isFinite(timeToMinutes(value)), "Informe um horário válido.");

/** Valor em reais (número ou texto "30,50") convertido para centavos. */
export const moneyCents = z
  .union([z.number(), z.string()])
  .transform((value, context) => {
    const cents = toCents(value);
    if (cents === null || cents <= 0) {
      context.addIssue({ code: "custom", message: "Informe um valor maior que zero." });
      return z.NEVER;
    }
    return cents;
  });

export const percent = z.coerce.number().int("Use um percentual inteiro.").min(0).max(100, "O percentual deve ficar entre 0 e 100.");

export const positiveId = z.coerce.number().int().positive();

export const optionalId = z
  .union([z.coerce.number().int().nonnegative(), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? Number(value) : null));

export const transactionKind = z.enum(["entrada", "despesa"], { error: "Tipo de movimentação inválido." });

// ─── Esquemas por recurso ────────────────────────────────────────────────────
// Os campos não têm valor padrão, para que `.partial()` sirva às edições
// (PATCH) sem sobrescrever o que não foi enviado.

export const serviceFields = z.object({
  name: text("o nome do serviço"),
  price: moneyCents,
  durationMin: z.coerce.number().int().min(5, "A duração mínima é de 5 minutos.").max(480, "A duração máxima é de 8 horas."),
  active: z.boolean(),
});

export const productFields = z.object({
  name: text("o nome do produto"),
  description: z.string().trim().max(1200),
  price: moneyCents,
  stock: z.coerce.number().int("O estoque deve ser um número inteiro.").min(0, "O estoque não pode ser negativo."),
  imageKey: z.string().max(500),
  active: z.boolean(),
});

export const collaboratorFields = z.object({
  name: text("o nome"),
  email,
  phone: z.string().trim().max(40),
  defaultCommissionPercent: percent,
  active: z.boolean(),
});

export const clientFields = z.object({
  name: text("o nome do cliente"),
  phone,
  birthDate: optionalDateKey,
});

export const recurringExpenseFields = z.object({
  description: text("a descrição", 120),
  amount: moneyCents,
  category: z.string().trim().max(40).optional(),
  dayOfMonth: z.coerce.number().int().min(1, "Informe um dia entre 1 e 31.").max(31, "Informe um dia entre 1 e 31."),
});
