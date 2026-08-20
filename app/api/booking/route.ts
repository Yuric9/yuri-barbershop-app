import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  appointments,
  appointmentSlots,
  businessSettings,
  catalogItems,
  collaborators,
  products,
  profiles,
  promotions,
  scheduleBlocks,
  services,
  subscriptions,
} from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

function localToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function localMinutesNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  return hour * 60 + minute;
}

function timeToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return Number.NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

function operatingWindow(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const day = new Date(`${date}T12:00:00`).getDay();
  return {
    start: day === 0 || day === 6 ? 8 * 60 : 18 * 60,
    end: day === 0 ? 12 * 60 : 20 * 60 + 30,
  };
}

function allowedBookingTimes(date: string, durationMin = 30) {
  const window = operatingWindow(date);
  if (!window) return [];
  const safeDuration = Math.max(5, Number(durationMin) || 30);
  const slots: string[] = [];
  for (let minutes = window.start; minutes + safeDuration <= window.end; minutes += 30) {
    slots.push(`${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`);
  }
  return slots;
}

function overlaps(startA: number, durationA: number, startB: number, durationB: number) {
  return startA < startB + durationB && startB < startA + durationA;
}

function noStore(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("cache-control", "no-store, max-age=0");
  return Response.json(body, { ...init, headers });
}

function unauthorized() {
  return noStore({ error: "Não autorizado" }, { status: 401 });
}

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();

  const db = getDb();
  const url = new URL(request.url);
  const selectedDate = url.searchParams.get("date") || "";
  const selectedServiceId = Number(url.searchParams.get("serviceId") || 0);
  const selectedCollaboratorId = Number(url.searchParams.get("collaboratorId") || 0);

  const [
    serviceRows,
    productRows,
    collaboratorRows,
    profileRows,
    catalogRows,
    promotionRows,
    subscriptionRows,
    appointmentRows,
    settingsRows,
  ] = await Promise.all([
    db.select().from(services).where(eq(services.active, true)),
    db.select().from(products).where(eq(products.active, true)),
    db.select().from(collaborators).where(eq(collaborators.active, true)),
    db.select().from(profiles).where(eq(profiles.email, user.email)).limit(1),
    db.select().from(catalogItems).where(eq(catalogItems.active, true)).orderBy(desc(catalogItems.id)),
    db.select().from(promotions).where(eq(promotions.active, true)).orderBy(desc(promotions.id)),
    db.select().from(subscriptions).where(eq(subscriptions.clientEmail, user.email)).orderBy(desc(subscriptions.id)),
    db.select().from(appointments).where(eq(appointments.clientEmail, user.email)).orderBy(desc(appointments.date), desc(appointments.time)),
    db.select().from(businessSettings).limit(1),
  ]);

  let occupiedTimes: string[] = [];
  if (selectedDate && selectedServiceId) {
    const selectedService = serviceRows.find((item) => item.id === selectedServiceId);
    if (selectedService) {
      const [dayAppointments, dayBlocks] = await Promise.all([
        db.select().from(appointments).where(eq(appointments.date, selectedDate)),
        db.select().from(scheduleBlocks).where(eq(scheduleBlocks.date, selectedDate)),
      ]);
      const durationByService = new Map(serviceRows.map((item) => [item.id, item.durationMin]));
      const activeAppointments = dayAppointments.filter((item) =>
        item.status !== "Cancelado" &&
        (!selectedCollaboratorId || !item.collaboratorId || item.collaboratorId === selectedCollaboratorId),
      );
      occupiedTimes = allowedBookingTimes(selectedDate, selectedService.durationMin).filter((slot) => {
        const slotStart = timeToMinutes(slot);
        return dayBlocks.some((block) => {
          if (selectedCollaboratorId && block.collaboratorId && block.collaboratorId !== selectedCollaboratorId) return false;
          if (block.time === "Dia inteiro") return true;
          const blockStart = timeToMinutes(block.time);
          return Number.isFinite(blockStart) && overlaps(slotStart, selectedService.durationMin, blockStart, 30);
        }) || activeAppointments.some((item) => {
          const existingStart = timeToMinutes(item.time);
          return Number.isFinite(existingStart) && overlaps(
            slotStart,
            selectedService.durationMin,
            existingStart,
            durationByService.get(item.serviceId) || 30,
          );
        });
      });
    }
  }

  const settings = settingsRows[0] || { loyaltyTarget: 10, loyaltyReward: "1 atendimento grátis" };
  return noStore({
    services: serviceRows,
    products: productRows,
    collaborators: collaboratorRows.map((item) => ({ id: item.id, name: item.name, active: item.active })),
    profiles: profileRows,
    catalogItems: catalogRows,
    promotions: promotionRows,
    subscriptions: subscriptionRows,
    appointments: appointmentRows,
    settings: {
      loyaltyTarget: settings.loyaltyTarget,
      loyaltyReward: settings.loyaltyReward,
    },
    occupiedTimes,
  });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();

  const body = (await request.json()) as Record<string, unknown>;
  if (String(body.action || "") !== "appointment") {
    return noStore({ error: "Ação de agendamento inválida" }, { status: 400 });
  }

  const db = getDb();
  const serviceId = Number(body.serviceId || 0);
  const date = String(body.date || "");
  const time = String(body.time || "");
  const requestedCollaboratorId = Number(body.collaboratorId || 0);
  const styleName = String(body.styleName || "").trim().slice(0, 120);

  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.active, true)))
    .limit(1);
  if (!service) return noStore({ error: "Serviço inválido" }, { status: 400 });

  const today = localToday();
  if (!date || !time) return noStore({ error: "Escolha uma data e um horário" }, { status: 400 });
  if (date < today) return noStore({ error: "Não é possível agendar em uma data passada." }, { status: 400 });
  if (!allowedBookingTimes(date, service.durationMin).includes(time)) {
    return noStore({ error: "Este serviço não cabe neste horário antes do fechamento." }, { status: 400 });
  }
  const requestedStart = timeToMinutes(time);
  if (date === today && requestedStart <= localMinutesNow()) {
    return noStore({ error: "Este horário já passou. Escolha outro." }, { status: 409 });
  }

  const activeCollaborators = await db.select().from(collaborators).where(eq(collaborators.active, true));
  let collaborator = requestedCollaboratorId
    ? activeCollaborators.find((item) => item.id === requestedCollaboratorId)
    : undefined;
  if (!collaborator && activeCollaborators.length === 1) collaborator = activeCollaborators[0];
  if (requestedCollaboratorId && !collaborator) {
    return noStore({ error: "Profissional indisponível" }, { status: 400 });
  }
  if (!requestedCollaboratorId && activeCollaborators.length > 1) {
    return noStore({ error: "Escolha o profissional para reservar este horário." }, { status: 400 });
  }

  const rawItems = Array.isArray(body.products) ? body.products.slice(0, 20) : [];
  const normalizedItems = rawItems
    .map((item: { id?: unknown; quantity?: unknown }) => ({ id: Number(item?.id || 0), quantity: Math.max(0, Math.floor(Number(item?.quantity || 0))) }))
    .filter((item) => item.id > 0 && item.quantity > 0);
  const uniqueIds = [...new Set(normalizedItems.map((item) => item.id))];
  const productRows = uniqueIds.length
    ? await db.select().from(products).where(and(inArray(products.id, uniqueIds), eq(products.active, true)))
    : [];
  const productById = new Map(productRows.map((item) => [item.id, item]));

  let productTotalCents = 0;
  const productDescriptions: string[] = [];
  for (const item of normalizedItems) {
    const product = productById.get(item.id);
    if (!product) return noStore({ error: "Um dos produtos não está mais disponível." }, { status: 409 });
    if (item.quantity > Math.max(0, Number(product.stock))) {
      return noStore({ error: `Estoque insuficiente para ${product.name}.` }, { status: 409 });
    }
    productTotalCents += product.priceCents * item.quantity;
    productDescriptions.push(`${item.quantity}x ${product.name}`);
  }

  const [dayBlocks, dayAppointments, profileRows] = await Promise.all([
    db.select().from(scheduleBlocks).where(eq(scheduleBlocks.date, date)),
    db.select().from(appointments).where(eq(appointments.date, date)),
    db.select().from(profiles).where(eq(profiles.email, user.email)).limit(1),
  ]);

  const blocked = dayBlocks.some((block) => {
    if (block.collaboratorId && block.collaboratorId !== collaborator?.id) return false;
    if (block.time === "Dia inteiro") return true;
    const blockStart = timeToMinutes(block.time);
    return Number.isFinite(blockStart) && overlaps(requestedStart, service.durationMin, blockStart, 30);
  });
  if (blocked) return noStore({ error: "Este período está bloqueado na agenda." }, { status: 409 });

  const exactExisting = dayAppointments.find((item) =>
    item.status !== "Cancelado" &&
    item.clientEmail === user.email &&
    item.serviceId === serviceId &&
    item.time === time,
  );
  if (exactExisting) return noStore({ ok: true, appointment: exactExisting, reused: true });

  const activeAppointments = dayAppointments.filter(
    (item) => item.status !== "Cancelado" && (!collaborator || !item.collaboratorId || item.collaboratorId === collaborator.id),
  );
  const serviceIds = [...new Set(activeAppointments.map((item) => item.serviceId))];
  const durationRows = serviceIds.length
    ? await db.select({ id: services.id, durationMin: services.durationMin }).from(services).where(inArray(services.id, serviceIds))
    : [];
  const durationByService = new Map(durationRows.map((item) => [item.id, item.durationMin]));
  const conflict = activeAppointments.some((item) => {
    const existingStart = timeToMinutes(item.time);
    return Number.isFinite(existingStart) && overlaps(
      requestedStart,
      service.durationMin,
      existingStart,
      durationByService.get(item.serviceId) || 30,
    );
  });
  if (conflict) return noStore({ error: "Este período acabou de ser reservado. Escolha outro horário." }, { status: 409 });

  const now = new Date().toISOString();
  const reservationId = crypto.randomUUID();
  const resourceKey = collaborator ? `barber:${collaborator.id}` : "shop";
  const slotTimes = Array.from(
    { length: Math.max(1, Math.ceil(service.durationMin / 30)) },
    (_, index) => {
      const minutes = requestedStart + index * 30;
      return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    },
  );
  try {
    await db.insert(appointmentSlots).values(slotTimes.map((slotTime) => ({
      date,
      time: slotTime,
      resourceKey,
      reservationId,
      createdAt: now,
    })));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    if (/unique|constraint|appointment_slots_unique/i.test(detail)) {
      return noStore({ error: "Este período acabou de ser reservado. Escolha outro horário." }, { status: 409 });
    }
    throw error;
  }

  const onlyProduct = normalizedItems.length === 1 ? productById.get(normalizedItems[0].id) : undefined;
  let created: typeof appointments.$inferSelect;
  try {
    [created] = await db.insert(appointments).values({
      clientEmail: user.email,
      clientName: profileRows[0]?.name || user.displayName,
      serviceId: service.id,
      serviceName: service.name,
      productId: onlyProduct?.id,
      productName: productDescriptions.length ? productDescriptions.join(", ") : null,
      date,
      time,
      totalCents: service.priceCents + productTotalCents,
      collaboratorId: collaborator?.id,
      collaboratorName: collaborator?.name || "A definir",
      adminMessage: styleName ? `Estilo escolhido: ${styleName}` : "",
      createdAt: now,
    }).returning();
    await db.update(appointmentSlots).set({ appointmentId: created.id }).where(eq(appointmentSlots.reservationId, reservationId));
  } catch (error) {
    await db.delete(appointmentSlots).where(eq(appointmentSlots.reservationId, reservationId));
    throw error;
  }

  return noStore({ ok: true, appointment: created });
}
