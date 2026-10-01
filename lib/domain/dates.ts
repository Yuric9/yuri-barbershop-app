/**
 * Datas do negócio.
 *
 * Toda a operação da barbearia acontece no fuso de São Paulo. As datas são
 * trafegadas como texto no formato ISO curto ("2026-10-01"), o mesmo usado no
 * banco, para evitar erros de fuso horário ao converter para `Date`.
 */

export const BUSINESS_TIME_ZONE = "America/Sao_Paulo";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_KEY = /^\d{4}-\d{2}$/;

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;

function zonedParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}

/** Data de hoje em São Paulo, no formato "AAAA-MM-DD". */
export function todayKey(now = new Date()) {
  const { year, month, day } = zonedParts(now);
  return `${year}-${month}-${day}`;
}

/** Horário atual em São Paulo, no formato "HH:MM". */
export function nowTime(now = new Date()) {
  const { hour, minute } = zonedParts(now);
  return `${hour}:${minute}`;
}

/** Minutos passados desde a meia-noite em São Paulo. */
export function nowMinutes(now = new Date()) {
  const { hour, minute } = zonedParts(now);
  return Number(hour) * 60 + Number(minute);
}

export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_KEY.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && MONTH_KEY.test(value) && Number(value.slice(5)) >= 1 && Number(value.slice(5)) <= 12;
}

/** Converte "AAAA-MM-DD" em um `Date` ao meio-dia UTC (seguro contra fuso). */
function toNoonUtc(key: string) {
  return new Date(`${key}T12:00:00Z`);
}

export function addDays(key: string, days: number) {
  const date = toNoonUtc(key);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Diferença em dias inteiros entre duas datas (b - a). */
export function daysBetween(a: string, b: string) {
  return Math.round((toNoonUtc(b).getTime() - toNoonUtc(a).getTime()) / 86_400_000);
}

/** Dia da semana (0 = domingo … 6 = sábado). */
export function weekday(key: string) {
  return toNoonUtc(key).getUTCDay();
}

/** Primeiro e último dia de um mês "AAAA-MM". */
export function monthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, "0")}` };
}

export function formatDate(key: string | null | undefined, fallback = "—") {
  if (!key || !isDateKey(key)) return fallback;
  const [year, month, day] = key.split("-");
  return `${day}/${month}/${year}`;
}

export function formatLongDate(key: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(toNoonUtc(key));
}

export function formatWeekdayShort(key: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short" })
    .format(toNoonUtc(key))
    .replace(".", "");
}
