import { Badge, type BadgeTone } from "../ui/layout";

const TONES: Record<string, BadgeTone> = {
  Pendente: "warning",
  Confirmado: "info",
  Finalizado: "success",
  Cancelado: "danger",
};

export function AppointmentStatus({ status }: { status: string }) {
  return <Badge tone={TONES[status] ?? "neutral"}>{status}</Badge>;
}
