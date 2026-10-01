import { eq } from "drizzle-orm";
import type { Database } from "../../db";
import { appointments, profiles } from "../../db/schema";
import { COURTESY } from "../domain/catalog";
import { daysBetween } from "../domain/dates";
import { loyaltySnapshot, type LoyaltySnapshot } from "../domain/loyalty";
import { clientEmailForPhone, phoneDigits } from "../domain/phone";
import { ApiError } from "./http";

export type ClientSummary = {
  email: string;
  name: string;
  phone: string;
  birthDate: string;
  createdAt: string;
  appointmentsCount: number;
  finalizedCount: number;
  totalSpentCents: number;
  lastVisit: string | null;
  lastService: string | null;
  lastStatus: string | null;
  daysSinceLastVisit: number | null;
  loyalty: LoyaltySnapshot;
  loyaltyNote: string;
};

type AppointmentRow = typeof appointments.$inferSelect;

export function isPaidVisit(appointment: Pick<AppointmentRow, "status" | "paymentMethod">) {
  return appointment.status === "Finalizado" && appointment.paymentMethod !== COURTESY;
}

/** Ficha resumida de cada cliente: histórico, valor gasto e cartão fidelidade. */
export async function listClientSummaries(db: Database, today: string): Promise<ClientSummary[]> {
  const [profileRows, appointmentRows] = await Promise.all([
    db.select().from(profiles).orderBy(profiles.name),
    db.select().from(appointments),
  ]);

  const byClient = new Map<string, AppointmentRow[]>();
  for (const appointment of appointmentRows) {
    const list = byClient.get(appointment.clientEmail) ?? [];
    list.push(appointment);
    byClient.set(appointment.clientEmail, list);
  }

  return profileRows.map((profile) => {
    const all = byClient.get(profile.email) ?? [];
    const history = all
      .filter((item) => item.date <= today && item.status !== "Cancelado")
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
    const finalized = all.filter((item) => item.status === "Finalizado");
    const last = history[0] ?? null;
    return {
      email: profile.email,
      name: profile.name,
      phone: profile.phone,
      birthDate: profile.birthDate,
      createdAt: profile.createdAt,
      appointmentsCount: history.length,
      finalizedCount: finalized.length,
      totalSpentCents: finalized.filter(isPaidVisit).reduce((sum, item) => sum + item.totalCents, 0),
      lastVisit: last?.date ?? null,
      lastService: last?.serviceName ?? null,
      lastStatus: last?.status ?? null,
      daysSinceLastVisit: last ? daysBetween(last.date, today) : null,
      loyalty: loyaltySnapshot(profile, finalized.filter(isPaidVisit).length),
      loyaltyNote: profile.loyaltyAdjustmentNote,
    };
  });
}

/** Garante que nenhum outro cliente usa o mesmo telefone. */
export async function assertPhoneAvailable(db: Database, phone: string, exceptEmail?: string) {
  const key = phoneDigits(phone);
  const rows = await db.select({ email: profiles.email, phone: profiles.phone }).from(profiles);
  if (rows.some((row) => row.email !== exceptEmail && phoneDigits(row.phone) === key)) {
    throw new ApiError(409, "Este telefone já está cadastrado para outro cliente.");
  }
}

/**
 * Cria o cliente ou atualiza o cadastro existente com o mesmo telefone.
 * Retorna o e-mail (identificador) do cliente.
 */
export async function upsertClientByPhone(
  db: Database,
  input: { name: string; phone: string; birthDate?: string },
  now: string,
) {
  const key = phoneDigits(input.phone);
  const rows = await db.select().from(profiles);
  const existing = rows.find((row) => phoneDigits(row.phone) === key);
  if (existing) {
    await db
      .update(profiles)
      .set({ name: input.name, phone: input.phone, birthDate: input.birthDate || existing.birthDate })
      .where(eq(profiles.email, existing.email));
    return { email: existing.email, name: input.name, phone: input.phone, created: false };
  }
  const email = clientEmailForPhone(input.phone);
  await db.insert(profiles).values({ email, name: input.name, phone: input.phone, birthDate: input.birthDate ?? "", createdAt: now });
  return { email, name: input.name, phone: input.phone, created: true };
}

export async function getClient(db: Database, email: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1);
  if (!profile) throw new ApiError(404, "Cliente não encontrado.");
  return profile;
}
