import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { appointmentSlots, appointments, profiles, services } from "../../../db/schema";

export const dynamic = "force-dynamic";

function normalizePhone(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function timeToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.NaN;
}

function operatingWindow(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const day = new Date(`${date}T12:00:00`).getDay();
  return {
    start: day === 0 || day === 6 ? 8 * 60 : 18 * 60,
    end: day === 0 ? 12 * 60 : 20 * 60 + 30,
  };
}

function allowedSlots(date: string, duration: number) {
  const window = operatingWindow(date);
  if (!window) return [];
  const slots: string[] = [];
  for (let minute = window.start; minute + duration <= window.end; minute += 30) {
    slots.push(`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
  }
  return slots;
}

function overlaps(startA: number, durationA: number, startB: number, durationB: number) {
  return startA < startB + durationB && startB < startA + durationA;
}

async function findService(serviceName: string) {
  const db = getDb();
  const [service] = await db.select().from(services).where(and(eq(services.name, serviceName), eq(services.active, true))).limit(1);
  return service || null;
}

async function availableSlots(date: string, serviceName: string) {
  const db = getDb();
  const service = await findService(serviceName);
  if (!service) return { service: null, slots: [] as string[] };

  const candidates = allowedSlots(date, service.durationMin);
  const rows = await db.select().from(appointments).where(eq(appointments.date, date));
  const active = rows.filter((item) => item.status !== "Cancelado");
  const servicesRows = await db.select().from(services);
  const durationMap = new Map<number, number>(servicesRows.map((row) => [row.id, row.durationMin]));

  const slots = candidates.filter((slot) => {
    const start = timeToMinutes(slot);
    return !active.some((item) => {
      const existingStart = timeToMinutes(item.time);
      const existingDuration = durationMap.get(item.serviceId) || 30;
      return Number.isFinite(existingStart) && overlaps(start, service.durationMin, existingStart, existingDuration);
    });
  });

  return { service, slots };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") || "";
  const serviceName = url.searchParams.get("service") || "";
  if (!date || !serviceName) return Response.json({ error: "Informe data e serviço." }, { status: 400 });
  const result = await availableSlots(date, serviceName);
  if (!result.service) return Response.json({ error: "Serviço não encontrado." }, { status: 404 });
  return Response.json({ service: result.service, slots: result.slots });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const name = String(body.name || "").trim();
  const phone = normalizePhone(body.phone);
  const date = String(body.date || "");
  const time = String(body.time || "");
  const serviceName = String(body.service || "").trim();

  if (name.length < 2) return Response.json({ error: "Informe seu nome." }, { status: 400 });
  if (phone.length < 10 || phone.length > 13) return Response.json({ error: "Informe um WhatsApp válido com DDD." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return Response.json({ error: "Informe uma data e horário válidos." }, { status: 400 });
  if (!serviceName) return Response.json({ error: "Escolha um serviço." }, { status: 400 });

  const db = getDb();
  const service = await findService(serviceName);
  if (!service) return Response.json({ error: "Serviço não encontrado. Atualize a página e tente novamente." }, { status: 404 });

  const validSlots = await availableSlots(date, serviceName);
  if (!validSlots.slots.includes(time)) return Response.json({ error: "Esse horário acabou de ficar indisponível. Escolha outro horário." }, { status: 409 });

  const phoneKey = normalizePhone(phone);
  const allProfiles = await db.select().from(profiles);
  const existingProfile = allProfiles.find((profile) => normalizePhone(profile.phone) === phoneKey);
  const clientEmail = existingProfile?.email || `public+${phoneKey}@yuricbarbershop.local`;
  const now = new Date().toISOString();

  if (!existingProfile) {
    await db.insert(profiles).values({ email: clientEmail, name, phone, birthDate: "", createdAt: now });
  } else {
    await db.update(profiles).set({ name, phone }).where(eq(profiles.email, existingProfile.email));
  }

  const [created] = await db.insert(appointments).values({
    clientEmail,
    clientName: name,
    serviceId: service.id,
    serviceName: service.name,
    date,
    time,
    status: "Pendente",
    adminMessage: "Solicitação pública pelo site",
    totalCents: service.priceCents,
    createdAt: now,
  }).returning();

  try {
    await db.insert(appointmentSlots).values({
      date,
      time,
      resourceKey: "main",
      reservationId: `public-${created.id}`,
      appointmentId: created.id,
      createdAt: now,
    });
  } catch {
    await db.delete(appointments).where(eq(appointments.id, created.id));
    return Response.json({ error: "Esse horário acabou de ser reservado. Escolha outro horário." }, { status: 409 });
  }

  return Response.json({ ok: true, appointmentId: created.id, service, date, time });
}
