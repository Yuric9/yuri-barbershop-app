/**
 * Regras da agenda: horário de funcionamento, horários disponíveis e
 * conflitos. Funções puras — não acessam banco de dados.
 */
import { isDateKey, weekday } from "./dates.ts";

/** Os horários são oferecidos em intervalos de 30 minutos. */
export const SLOT_MINUTES = 30;

/** Bloqueio que ocupa o dia todo (valor gravado em `schedule_blocks.time`). */
export const FULL_DAY_BLOCK = "Dia inteiro";

/**
 * Horário de atendimento (minutos desde a meia-noite).
 * - Segunda a sexta: 18h às 20h30
 * - Sábado: 8h às 20h30
 * - Domingo: 8h às 12h
 */
export function operatingWindow(date: string) {
  if (!isDateKey(date)) return null;
  const day = weekday(date);
  const weekend = day === 0 || day === 6;
  return {
    start: weekend ? 8 * 60 : 18 * 60,
    end: day === 0 ? 12 * 60 : 20 * 60 + 30,
  };
}

export function timeToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return Number.NaN;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return Number.NaN;
  return hours * 60 + minutes;
}

export function minutesToTime(total: number) {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Horários de início em que um atendimento com essa duração cabe antes do fechamento. */
export function startTimesFor(date: string, durationMin: number) {
  const window = operatingWindow(date);
  if (!window) return [];
  const duration = Math.max(SLOT_MINUTES, Math.round(durationMin) || SLOT_MINUTES);
  const times: string[] = [];
  for (let minutes = window.start; minutes + duration <= window.end; minutes += SLOT_MINUTES) {
    times.push(minutesToTime(minutes));
  }
  return times;
}

/** Faixas de 30 minutos ocupadas por um atendimento que começa em `time`. */
export function slotsCovered(time: string, durationMin: number) {
  const start = timeToMinutes(time);
  const count = Math.max(1, Math.ceil(durationMin / SLOT_MINUTES));
  return Array.from({ length: count }, (_, index) => minutesToTime(start + index * SLOT_MINUTES));
}

export function overlaps(startA: number, durationA: number, startB: number, durationB: number) {
  return startA < startB + durationB && startB < startA + durationA;
}

/** Um bloqueio de agenda afeta um atendimento que começa em `start`? */
export function blockAffects(blockTime: string, start: string, durationMin: number) {
  if (blockTime === FULL_DAY_BLOCK) return true;
  const a = timeToMinutes(start);
  const b = timeToMinutes(blockTime);
  return Number.isFinite(a) && Number.isFinite(b) && overlaps(a, durationMin, b, SLOT_MINUTES);
}

/** O horário já passou? (para a data de hoje) */
export function isPastSlot(date: string, time: string, today: string, currentMinutes: number) {
  if (date < today) return true;
  return date === today && timeToMinutes(time) <= currentMinutes;
}

export type SlotLock = { time: string; resourceKey: string };
export type ScheduleBlock = { time: string; collaboratorId: number | null };

/** Chave do "recurso" reservado: um barbeiro específico ou a barbearia inteira. */
export function resourceKeyFor(collaboratorId: number | null | undefined) {
  return collaboratorId ? `barber:${collaboratorId}` : "shop";
}

/**
 * Procura um recurso (barbeiro) livre para o horário.
 * Retorna a chave do recurso ou `null` se todos estiverem ocupados.
 */
export function findFreeResource(options: {
  time: string;
  durationMin: number;
  resources: string[];
  locks: SlotLock[];
  blocks: ScheduleBlock[];
}) {
  const needed = slotsCovered(options.time, options.durationMin);
  for (const resource of options.resources) {
    const collaboratorId = resource.startsWith("barber:") ? Number(resource.slice(7)) : 0;
    const blocked = options.blocks.some(
      (block) =>
        (!collaboratorId || !block.collaboratorId || block.collaboratorId === collaboratorId) &&
        blockAffects(block.time, options.time, options.durationMin),
    );
    if (blocked) continue;
    const busy = needed.some((slot) => options.locks.some((lock) => lock.resourceKey === resource && lock.time === slot));
    if (!busy) return resource;
  }
  return null;
}
