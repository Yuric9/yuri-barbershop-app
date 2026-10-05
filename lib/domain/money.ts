/** Valores monetários são guardados em centavos (inteiros) para evitar erros de arredondamento. */

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatMoney(cents: number | null | undefined) {
  return currency.format((Number(cents) || 0) / 100);
}

/**
 * Converte um valor em reais para centavos. Aceita número (30.5) ou texto
 * ("30,50", "R$ 1.234,56", "1.000"). Retorna `null` quando o valor é inválido.
 *
 * Sem vírgula, o ponto seguido de grupos de 3 dígitos é separador de milhar
 * ("1.000" = mil reais, "8.500" = oito mil e quinhentos); nos demais casos
 * ("30.50", "1.5") ele é a vírgula decimal.
 */
export function toCents(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value * 100) : null;
  if (typeof value !== "string") return null;
  let text = value.replace(/[R$\s]/g, "");
  if (!text) return null;
  if (text.includes(",")) text = text.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) text = text.replace(/\./g, "");
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  return Math.round(Number(text) * 100);
}

/** Centavos → texto para inputs, no formato brasileiro ("30,00"). */
export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function percentOf(cents: number, percent: number) {
  return Math.round((cents * percent) / 100);
}

export function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
