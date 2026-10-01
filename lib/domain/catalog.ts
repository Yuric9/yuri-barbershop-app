/** Valores fixos usados em formulários e validações. */

export const APPOINTMENT_STATUSES = ["Pendente", "Confirmado", "Finalizado", "Cancelado"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["Pix", "Dinheiro", "Cartão de débito", "Cartão de crédito"] as const;

export const COURTESY = "Cortesia";

/** Serviços criados automaticamente no primeiro acesso. */
export const DEFAULT_SERVICES = [
  { name: "Corte", priceCents: 3000, durationMin: 60 },
  { name: "Barba", priceCents: 3000, durationMin: 40 },
  { name: "Corte + Barba", priceCents: 5000, durationMin: 90 },
  { name: "Sobrancelha", priceCents: 1500, durationMin: 15 },
  { name: "Pigmentação", priceCents: 3000, durationMin: 30 },
] as const;

/** Transições de status permitidas na agenda. */
export function canTransition(from: string, to: AppointmentStatus) {
  if (from === to) return false;
  if (from === "Finalizado" || from === "Cancelado") return false;
  return true;
}
