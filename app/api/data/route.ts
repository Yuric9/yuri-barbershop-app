import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  appointments,
  appointmentSlots,
  accounts,
  catalogItems,
  messages,
  reviews,
  waitlist,
  scheduleBlocks,
  businessSettings,
  marketingContacts,
  products,
  promotions,
  profiles,
  services,
  subscriptions,
  subscriptionCampaigns,
  transactions,
  collaborators,
  collaboratorServices,
  commissionSettlements,
} from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { hashPassword } from "../../password-security";

export const dynamic = "force-dynamic";
const defaults = [
  ["Corte", 3000, 60],
  ["Barba", 3000, 40],
  ["Corte + Barba", 5000, 90],
  ["Sobrancelha", 1500, 15],
  ["Pigmentação", 3000, 30],
] as const;

function localToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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

function unauthorized() {
  return Response.json({ error: "Não autorizado" }, { status: 401 });
}

function normalizePhone(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

const LOYALTY_TARGET = 8;

function loyaltySnapshot(profile: typeof profiles.$inferSelect, finalizedPaidCount: number) {
  const eligibleVisits = Math.max(0, finalizedPaidCount + Number(profile.loyaltyAdjustment || 0));
  const earnedRewards = Math.floor(eligibleVisits / LOYALTY_TARGET);
  const availableRewards = Math.max(0, earnedRewards - Number(profile.loyaltyRewardsRedeemed || 0));
  return {
    loyaltyTarget: LOYALTY_TARGET,
    loyaltyEligibleVisits: eligibleVisits,
    loyaltyProgress: availableRewards > 0 ? LOYALTY_TARGET : eligibleVisits % LOYALTY_TARGET,
    loyaltyEarnedRewards: earnedRewards,
    loyaltyAvailableRewards: availableRewards,
    loyaltyRewardAvailable: availableRewards > 0,
    loyaltyManualAdjustment: Number(profile.loyaltyAdjustment || 0),
  };
}

function forbidden() {
  return Response.json(
    { error: "Acesso restrito ao administrador" },
    { status: 403 },
  );
}

async function seedServices() {
  const db = getDb();
  const existing = await db.select().from(services).limit(1);
  if (!existing.length)
    await db
      .insert(services)
      .values(
        defaults.map(([name, priceCents, durationMin]) => ({
          name,
          priceCents,
          durationMin,
        })),
      );
}

async function finalizeAppointment(db: ReturnType<typeof getDb>, appointment: typeof appointments.$inferSelect, status: string, paymentMethod: string, message: string, actorEmail: string, now: string) {
  if (!["Pendente", "Confirmado", "Finalizado", "Cancelado"].includes(status)) throw new Error("Status de agendamento inválido");
  if (status !== "Finalizado" || appointment.status === "Finalizado") {
    await db.update(appointments).set({ status, adminMessage: message }).where(eq(appointments.id, appointment.id));
    if (status === "Cancelado") {
      await db.delete(appointmentSlots).where(eq(appointmentSlots.appointmentId, appointment.id));
    }
    return;
  }
  let commissionPercent = 0;
  if (appointment.collaboratorId) {
    const [collaborator] = await db.select().from(collaborators).where(eq(collaborators.id, appointment.collaboratorId)).limit(1);
    const [override] = await db.select().from(collaboratorServices).where(and(eq(collaboratorServices.collaboratorId, appointment.collaboratorId), eq(collaboratorServices.serviceId, appointment.serviceId), eq(collaboratorServices.active, true))).limit(1);
    commissionPercent = Math.max(0, Math.min(100, override?.commissionPercent ?? collaborator?.defaultCommissionPercent ?? 0));
  }
  const courtesy = paymentMethod === "Cortesia";
  if (courtesy) {
    const [profile] = await db.select().from(profiles).where(eq(profiles.email, appointment.clientEmail)).limit(1);
    const previousPaid = await db.select().from(appointments).where(eq(appointments.clientEmail, appointment.clientEmail));
    const paidCount = previousPaid.filter((item) => item.status === "Finalizado" && item.paymentMethod !== "Cortesia").length;
    const snapshot = profile ? loyaltySnapshot(profile, paidCount) : null;
    if (!profile || !snapshot?.loyaltyRewardAvailable) throw new Error("Este cliente ainda não possui atendimento gratuito disponível.");
    await db.update(appointments).set({ status, adminMessage: message, paymentMethod, commissionPercent: 0, commissionCents: 0, cashTransactionId: null }).where(eq(appointments.id, appointment.id));
    await db.update(profiles).set({ loyaltyRewardsRedeemed: sql`${profiles.loyaltyRewardsRedeemed} + 1`, loyaltyUpdatedAt: now, loyaltyUpdatedBy: actorEmail }).where(eq(profiles.email, appointment.clientEmail));
    if (message.trim()) await db.insert(messages).values({ senderEmail: actorEmail, senderName: "Yuri Barbershop", recipientEmail: appointment.clientEmail, subject: `Atualização do agendamento: ${appointment.serviceName}`, body: message.trim(), createdAt: now });
    return;
  }
  const [cashEntry] = await db.insert(transactions).values({
    kind: "entrada",
    description: `${appointment.serviceName} — ${appointment.clientName}`,
    amountCents: appointment.totalCents,
    date: appointment.date,
    appointmentId: appointment.id,
    collaboratorId: appointment.collaboratorId,
    paymentMethod,
    createdAt: now,
  }).returning();
  await db.update(appointments).set({
    status,
    adminMessage: message,
    paymentMethod,
    commissionPercent,
    commissionCents: Math.round(appointment.totalCents * commissionPercent / 100),
    cashTransactionId: cashEntry.id,
  }).where(eq(appointments.id, appointment.id));
  if (message.trim()) await db.insert(messages).values({ senderEmail: actorEmail, senderName: "Yuri Barbershop", recipientEmail: appointment.clientEmail, subject: `Atualização do agendamento: ${appointment.serviceName}`, body: message.trim(), createdAt: now });
}

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  await seedServices();
  const db = getDb();
  const isAdmin = user.role === "admin";
  const isBarber = user.role === "barber";
  if (isAdmin) {
    const owner = await db.select().from(collaborators).where(eq(collaborators.email, user.email)).limit(1);
    if (!owner.length) await db.insert(collaborators).values({ email: user.email, name: user.displayName || "Yuri César", defaultCommissionPercent: 100, active: true, owner: true, createdAt: new Date().toISOString() });
  }
  const [currentCollaborator] = isBarber ? await db.select().from(collaborators).where(eq(collaborators.email, user.email)).limit(1) : [];
  const [
    serviceRows,
    productRows,
    appointmentRows,
    profileRows,
    transactionRows,
    promotionRows,
    catalogRows,
    subscriptionRows,
    messageRows,
    reviewRows,
    waitlistRows,
    blockRows,
    settingsRows,
    subscriptionCampaignRows,
    marketingContactRows,
    collaboratorRows,
    collaboratorServiceRows,
    settlementRows,
  ] = await Promise.all([
    db.select().from(services).where(eq(services.active, true)),
    db.select().from(products).where(eq(products.active, true)),
    isAdmin
      ? db.select().from(appointments).orderBy(desc(appointments.date), desc(appointments.time))
      : isBarber && currentCollaborator
        ? db.select().from(appointments).where(eq(appointments.collaboratorId, currentCollaborator.id)).orderBy(desc(appointments.date), desc(appointments.time))
        : db.select().from(appointments).where(eq(appointments.clientEmail, user.email)).orderBy(desc(appointments.date)),
    isAdmin ? db.select().from(profiles).orderBy(profiles.name) : db.select().from(profiles).where(eq(profiles.email, user.email)),
    isAdmin
      ? db.select().from(transactions).orderBy(desc(transactions.date))
      : isBarber && currentCollaborator
        ? db.select().from(transactions).where(eq(transactions.collaboratorId, currentCollaborator.id)).orderBy(desc(transactions.date))
        : Promise.resolve([]),
    db.select().from(promotions).where(eq(promotions.active, true)).orderBy(desc(promotions.id)),
    db.select().from(catalogItems).where(eq(catalogItems.active, true)).orderBy(desc(catalogItems.id)),
    isAdmin ? db.select().from(subscriptions).orderBy(desc(subscriptions.id)) : db.select().from(subscriptions).where(eq(subscriptions.clientEmail, user.email)).orderBy(desc(subscriptions.id)),
    isAdmin ? db.select().from(messages).where(eq(messages.recipientEmail, "admin")).orderBy(desc(messages.id)) : db.select().from(messages).where(eq(messages.recipientEmail, user.email)).orderBy(desc(messages.id)),
    isAdmin ? db.select().from(reviews).orderBy(desc(reviews.id)) : db.select().from(reviews).where(eq(reviews.clientEmail, user.email)).orderBy(desc(reviews.id)),
    isAdmin ? db.select().from(waitlist).orderBy(desc(waitlist.id)) : db.select().from(waitlist).where(eq(waitlist.clientEmail, user.email)).orderBy(desc(waitlist.id)),
    db.select().from(scheduleBlocks).orderBy(desc(scheduleBlocks.date)),
    db.select().from(businessSettings).limit(1),
    db.select().from(subscriptionCampaigns).where(eq(subscriptionCampaigns.active, true)).orderBy(desc(subscriptionCampaigns.id)),
    isAdmin ? db.select().from(marketingContacts).orderBy(desc(marketingContacts.updatedAt)) : Promise.resolve([]),
    isAdmin ? db.select().from(collaborators).orderBy(collaborators.name) : db.select().from(collaborators).where(eq(collaborators.active, true)).orderBy(collaborators.name),
    db.select().from(collaboratorServices).where(eq(collaboratorServices.active, true)),
    isAdmin
      ? db.select().from(commissionSettlements).orderBy(desc(commissionSettlements.id))
      : isBarber && currentCollaborator
        ? db.select().from(commissionSettlements).where(eq(commissionSettlements.collaboratorId, currentCollaborator.id)).orderBy(desc(commissionSettlements.id))
        : Promise.resolve([]),
  ]);
  const requestUrl = new URL(request.url);
  const selectedDate = requestUrl.searchParams.get("date");
  const selectedServiceId = Number(requestUrl.searchParams.get("serviceId") || 0);
  const selectedService = serviceRows.find((item) => item.id === selectedServiceId);
  const selectedDuration = selectedService?.durationMin || 30;
  let occupiedTimes: string[] = [];
  if (selectedDate) {
    const dayAppointments = await db.select().from(appointments).where(eq(appointments.date, selectedDate));
    const serviceDuration = new Map(serviceRows.map((item) => [item.id, item.durationMin]));
    const activeAppointments = dayAppointments.filter((item) => item.status !== "Cancelado");
    const dayBlocks = blockRows.filter((item) => item.date === selectedDate);
    occupiedTimes = allowedBookingTimes(selectedDate, selectedDuration).filter((slot) => {
      const slotStart = timeToMinutes(slot);
      return dayBlocks.some((block) => {
        if (block.time === "Dia inteiro") return true;
        const blockStart = timeToMinutes(block.time);
        return Number.isFinite(blockStart) && overlaps(slotStart, selectedDuration, blockStart, 30);
      }) || activeAppointments.some((item) => {
        const existingStart = timeToMinutes(item.time);
        const existingDuration = serviceDuration.get(item.serviceId) || 30;
        return Number.isFinite(existingStart) && overlaps(slotStart, selectedDuration, existingStart, existingDuration);
      });
    });
  }
  const today = localToday();
  const clientSummaries = isAdmin
    ? profileRows.map((profile) => {
        const history = appointmentRows
          .filter((item) => item.clientEmail === profile.email && item.date <= today && item.status !== "Cancelado")
          .sort((a, b) => b.date.localeCompare(a.date));
        const finalized = history.filter((item) => item.status === "Finalizado");
        const lastAppointment = history[0] || null;
        const daysSinceLastVisit = lastAppointment
          ? Math.floor((Date.now() - new Date(`${lastAppointment.date}T12:00:00`).getTime()) / 86400000)
          : null;
        const subscription = subscriptionRows.find((item) => item.clientEmail === profile.email) || null;
        const loyalty = loyaltySnapshot(profile, finalized.filter((item) => item.paymentMethod !== "Cortesia").length);
        const subscriptionStatus = subscription?.status === "Ativa" && subscription.endDate && subscription.endDate < today
          ? "Vencida"
          : subscription?.status || "Sem assinatura";
        return {
          ...profile,
          appointmentsCount: history.length,
          finalizedCount: finalized.length,
          loyaltyRewards: loyalty.loyaltyEarnedRewards,
          totalSpentCents: history.filter((item) => item.paymentMethod !== "Cortesia").reduce((sum, item) => sum + item.totalCents, 0),
          lastVisit: lastAppointment?.date || null,
          lastService: lastAppointment?.serviceName || null,
          lastStatus: lastAppointment?.status || null,
          daysSinceLastVisit,
          needsRemarketing: daysSinceLastVisit !== null && daysSinceLastVisit >= 15,
          subscriptionStatus,
          subscriptionEndDate: subscription?.endDate || null,
          loyaltyRewardsRedeemed: Number(profile.loyaltyRewardsRedeemed || 0),
          loyaltyAdjustmentNote: profile.loyaltyAdjustmentNote || "",
          ...loyalty,
        };
      })
    : [];
  const publicCollaborators = collaboratorRows.map((item) => ({ id: item.id, name: item.name, active: item.active }));
  const visibleCollaboratorServices = isAdmin
    ? collaboratorServiceRows
    : isBarber && currentCollaborator
      ? collaboratorServiceRows.filter((item) => item.collaboratorId === currentCollaborator.id)
      : collaboratorServiceRows.map((item) => ({ id: item.id, collaboratorId: item.collaboratorId, serviceId: item.serviceId, active: item.active }));
  const visibleBlocks = isAdmin
    ? blockRows
    : isBarber && currentCollaborator
      ? blockRows.filter((item) => !item.collaboratorId || item.collaboratorId === currentCollaborator.id)
      : [];
  const settings = settingsRows[0] || { monthlyGoalCents: 500000, loyaltyTarget: LOYALTY_TARGET, loyaltyReward: "1 atendimento grátis" };
  const visibleSettings = isAdmin ? { ...settings, loyaltyTarget: LOYALTY_TARGET, loyaltyReward: "1 atendimento grátis" } : { loyaltyTarget: LOYALTY_TARGET, loyaltyReward: "1 atendimento grátis" };
  const clientProfile = !isAdmin && !isBarber ? profileRows[0] : null;
  const clientPaidFinalizedCount = !isAdmin && !isBarber
    ? appointmentRows.filter((item) => item.status === "Finalizado" && item.paymentMethod !== "Cortesia").length
    : 0;
  const clientLoyalty = clientProfile ? loyaltySnapshot(clientProfile, clientPaidFinalizedCount) : null;

  return Response.json({
    isAdmin,
    isBarber,
    currentCollaborator,
    services: serviceRows,
    products: productRows,
    appointments: appointmentRows,
    profiles: profileRows.filter((profile) => profile.email === user.email),
    clientLoyalty,
    transactions: transactionRows,
    occupiedTimes,
    clientSummaries,
    promotions: promotionRows,
    catalogItems: catalogRows,
    subscriptions: subscriptionRows,
    messages: messageRows,
    reviews: reviewRows,
    waitlist: waitlistRows,
    scheduleBlocks: visibleBlocks,
    settings: visibleSettings,
    subscriptionCampaigns: subscriptionCampaignRows,
    marketingContacts: marketingContactRows,
    collaborators: isAdmin ? collaboratorRows : publicCollaborators,
    collaboratorServices: visibleCollaboratorServices,
    commissionSettlements: settlementRows,
  });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  const db = getDb();
  const body = (await request.json()) as Record<string, unknown>;
  const action = String(body.action || "");
  const isAdmin = user.role === "admin";
  const isBarber = user.role === "barber";
  const [currentCollaborator] = isBarber ? await db.select().from(collaborators).where(eq(collaborators.email, user.email)).limit(1) : [];
  const now = new Date().toISOString();

  if (action === "profile") {
    const name = String(body.name || user.displayName).trim();
    const phone = normalizePhone(body.phone);
    if (phone && (phone.length < 10 || phone.length > 13)) return Response.json({ error: "Informe um telefone válido com DDD." }, { status: 400 });
    const existingProfiles = await db.select({ email: profiles.email, phone: profiles.phone }).from(profiles);
    if (phone && existingProfiles.some((profile) => profile.email !== user.email && normalizePhone(profile.phone) === phone)) return Response.json({ error: "Este telefone já está cadastrado." }, { status: 409 });
    await db.insert(profiles).values({ email: user.email, name, phone, birthDate: String(body.birthDate || ""), createdAt: now }).onConflictDoUpdate({ target: profiles.email, set: { name, phone, birthDate: String(body.birthDate || "") } });
    return Response.json({ ok: true });
  }
  if (action === "appointment") {
    return Response.json(
      { error: "Use a Central de Agendamentos para reservar um horário." },
      { status: 410 },
    );
  }
  if (action === "subscription-request") {
    const existing = await db.select().from(subscriptions).where(eq(subscriptions.clientEmail, user.email));
    if (existing.some((item) => item.status === "Ativa" || item.status === "Aguardando pagamento")) return Response.json({ error: "Você já possui uma assinatura ativa ou em análise." }, { status: 409 });
    const profile = await db.select().from(profiles).where(eq(profiles.email, user.email)).limit(1);
    await db.insert(subscriptions).values({ clientEmail: user.email, clientName: profile[0]?.name || user.displayName, createdAt: now });
    return Response.json({ ok: true });
  }
  if (action === "message-send") {
    const subject = String(body.subject || "Mensagem").trim();
    const messageBody = String(body.body || "").trim();
    if (!messageBody) return Response.json({ error: "Escreva uma mensagem" }, { status: 400 });
    const recipientEmail = isAdmin ? String(body.recipientEmail || "").trim().toLowerCase() : "admin";
    if (!recipientEmail) return Response.json({ error: "Escolha um cliente" }, { status: 400 });
    await db.insert(messages).values({ senderEmail: user.email, senderName: isAdmin ? "Yuri Barbershop" : user.displayName, recipientEmail, subject, body: messageBody, createdAt: now });
    return Response.json({ ok: true });
  }
  if (action === "message-read") {
    const recipientEmail = isAdmin ? "admin" : user.email;
    await db.update(messages).set({ read: true }).where(and(eq(messages.id, Number(body.id)), eq(messages.recipientEmail, recipientEmail)));
    return Response.json({ ok: true });
  }
  if (action === "review") {
    const rating = Math.max(1, Math.min(5, Number(body.rating)));
    await db.insert(reviews).values({ clientEmail: user.email, clientName: user.displayName, rating, comment: String(body.comment || "").trim(), createdAt: now });
    return Response.json({ ok: true });
  }
  if (action === "waitlist") {
    await db.insert(waitlist).values({ clientEmail: user.email, clientName: user.displayName, serviceName: String(body.serviceName || "Atendimento"), preferredDate: String(body.preferredDate || ""), preferredTime: String(body.preferredTime || ""), createdAt: now });
    return Response.json({ ok: true });
  }
  if (action === "promotion-engagement") {
    const id = Number(body.id);
    if (!id) return Response.json({ error: "Promoção inválida" }, { status: 400 });
    if (body.kind === "click") await db.update(promotions).set({ clicks: sql`${promotions.clicks} + 1` }).where(eq(promotions.id, id));
    else await db.update(promotions).set({ views: sql`${promotions.views} + 1` }).where(eq(promotions.id, id));
    return Response.json({ ok: true });
  }
  if (isBarber && action === "appointment-status") {
    const id = Number(body.id);
    const [appointment] = await db.select().from(appointments).where(and(eq(appointments.id, id), eq(appointments.collaboratorId, currentCollaborator?.id || -1))).limit(1);
    if (!appointment) return forbidden();
    const status = String(body.status || appointment.status);
    if (!["Confirmado", "Finalizado", "Cancelado"].includes(status)) return Response.json({ error: "Status inválido" }, { status: 400 });
    try { await finalizeAppointment(db, appointment, status, String(body.paymentMethod || "Dinheiro"), String(body.message || ""), user.email, now); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível finalizar o atendimento" }, { status: 409 }); }
    return Response.json({ ok: true });
  }
  if (!isAdmin) return forbidden();
  if (action === "client-update") {
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const birthDate = String(body.birthDate || "").trim();
    if (!email || !name || !phone) return Response.json({ error: "Informe nome, telefone e cliente válido" }, { status: 400 });
    const phoneKey = normalizePhone(phone);
    if (phoneKey.length < 8) return Response.json({ error: "Informe um telefone válido" }, { status: 400 });
    const duplicate = (await db.select().from(profiles)).find((profile) => profile.email !== email && normalizePhone(profile.phone) === phoneKey);
    if (duplicate) return Response.json({ error: "Este telefone já está cadastrado para outro cliente" }, { status: 409 });
    await db.update(profiles).set({ name, phone, birthDate }).where(eq(profiles.email, email));
    return Response.json({ ok: true });
  }
  if (action === "loyalty-adjust") {
    const email = String(body.email || "").trim().toLowerCase();
    const targetCount = Math.floor(Number(body.targetCount));
    const note = String(body.note || "").trim().slice(0, 240);
    if (!email || !Number.isFinite(targetCount) || targetCount < 0 || targetCount > 10000 || !note) return Response.json({ error: "Informe uma quantidade válida e o motivo do ajuste" }, { status: 400 });
    const [profile] = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1);
    if (!profile) return Response.json({ error: "Cliente não encontrado" }, { status: 404 });
    const rows = await db.select().from(appointments).where(eq(appointments.clientEmail, email));
    const automaticCount = rows.filter((item) => item.status === "Finalizado" && item.paymentMethod !== "Cortesia").length;
    await db.update(profiles).set({ loyaltyAdjustment: targetCount - automaticCount, loyaltyAdjustmentNote: note, loyaltyUpdatedAt: now, loyaltyUpdatedBy: user.email }).where(eq(profiles.email, email));
    return Response.json({ ok: true });
  }
  if (action === "client-create") {
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const informedEmail = String(body.email || "").trim().toLowerCase();
    if (!name || !phone) return Response.json({ error: "Informe nome e telefone" }, { status: 400 });
    const phoneKey = phone.replace(/\D/g, "") || String(Date.now());
    const profileRows = await db.select().from(profiles);
    const existing = profileRows.find((profile) => String(profile.phone || "").replace(/\D/g, "") === phoneKey);
    const email = existing?.email || informedEmail || `cliente-${phoneKey}@cadastro.local`;
    const update: { name: string; phone: string; birthDate?: string } = { name, phone };
    if (String(body.birthDate || "").trim()) update.birthDate = String(body.birthDate).trim();
    if (existing) await db.update(profiles).set(update).where(eq(profiles.email, existing.email));
    else await db.insert(profiles).values({ email, name, phone, birthDate: String(body.birthDate || ""), createdAt: now }).onConflictDoUpdate({ target: profiles.email, set: update });
    return Response.json({ ok: true, client: { email, name, phone } });
  }
  if (action === "client-import") {
    const received = Array.isArray(body.contacts) ? body.contacts.slice(0, 500) : [];
    const unique = new Map<string, { name: string; phone: string }>();
    for (const item of received) {
      const name = String(item?.name || "").trim().slice(0, 120);
      const phone = String(item?.phone || "").trim().slice(0, 40);
      const phoneKey = phone.replace(/\D/g, "");
      if (name && phoneKey.length >= 8) unique.set(phoneKey, { name, phone });
    }
    if (!unique.size) return Response.json({ error: "Nenhum contato válido foi encontrado" }, { status: 400 });
    const profileRows = await db.select().from(profiles);
    const profilesByPhone = new Map(profileRows.map((profile) => [String(profile.phone || "").replace(/\D/g, ""), profile]));
    for (const [phoneKey, contact] of unique) {
      const existing = profilesByPhone.get(phoneKey);
      if (existing) await db.update(profiles).set({ name: contact.name, phone: contact.phone }).where(eq(profiles.email, existing.email));
      else {
        const email = `cliente-${phoneKey}@cadastro.local`;
        await db.insert(profiles).values({ email, name: contact.name, phone: contact.phone, birthDate: "", createdAt: now }).onConflictDoUpdate({ target: profiles.email, set: { name: contact.name, phone: contact.phone } });
      }
    }
    return Response.json({ ok: true, imported: unique.size });
  }
  if (action === "service") {
    await db.insert(services).values({ name: String(body.name), priceCents: Math.round(Number(body.price) * 100), durationMin: Number(body.duration) });
  } else if (action === "service-update") {
    const name = String(body.name || "").trim();
    const priceCents = Math.round(Number(body.price) * 100);
    const durationMin = Number(body.duration);
    if (!name || priceCents <= 0 || durationMin < 5) return Response.json({ error: "Dados do serviço inválidos" }, { status: 400 });
    await db.update(services).set({ name, priceCents, durationMin, active: body.active !== false }).where(eq(services.id, Number(body.id)));
  } else if (action === "product") {
    await db.insert(products).values({ name: String(body.name), description: String(body.description || ""), priceCents: Math.round(Number(body.price) * 100), stock: Number(body.stock || 0), imageKey: String(body.imageKey || ""), featured: body.featured === true, showOnLogin: body.showOnLogin === true });
  } else if (action === "promotion") {
    await db.insert(promotions).values({ title: String(body.title || "").trim(), description: String(body.description || "").trim(), validUntil: String(body.validUntil || ""), imageKey: String(body.imageKey || ""), showOnLogin: false, audience: body.audience === "Assinantes" ? "Assinantes" : "Todos", createdAt: now });
  } else if (action === "product-campaign") {
    await db.update(products).set({ featured: body.featured === true, showOnLogin: body.showOnLogin === true }).where(eq(products.id, Number(body.id)));
  } else if (action === "subscription-campaign") {
    await db.insert(subscriptionCampaigns).values({ title: String(body.title || "Clube Yuri").trim(), description: String(body.description || "").trim(), imageKey: String(body.imageKey || ""), showOnLogin: body.showOnLogin === true, createdAt: now });
  } else if (action === "catalog-item") {
    await db.insert(catalogItems).values({ name: String(body.name || "").trim(), category: String(body.category || "corte"), description: String(body.description || "").trim(), imageKey: String(body.imageKey || ""), createdAt: now });
  } else if (action === "transaction") {
    const serviceId = body.serviceId ? Number(body.serviceId) : null;
    const [linkedService] = serviceId ? await db.select().from(services).where(eq(services.id, serviceId)).limit(1) : [];
    const clientEmail = String(body.clientEmail || "").trim().toLowerCase();
    const [linkedClient] = clientEmail ? await db.select().from(profiles).where(eq(profiles.email, clientEmail)).limit(1) : [];
    await db.insert(transactions).values({ kind: String(body.kind), description: String(body.description), amountCents: Math.round(Number(body.amount) * 100), date: String(body.date), clientEmail: linkedClient?.email || "", clientName: linkedClient?.name || "", serviceId: linkedService?.id || null, serviceName: linkedService?.name || "", collaboratorId: body.collaboratorId ? Number(body.collaboratorId) : null, paymentMethod: String(body.paymentMethod || ""), createdAt: now });
  } else if (action === "appointment-status") {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, Number(body.id))).limit(1);
    if (!appointment) return Response.json({ error: "Agendamento não encontrado" }, { status: 404 });
    try { await finalizeAppointment(db, appointment, String(body.status), String(body.paymentMethod || "Dinheiro"), String(body.message || ""), user.email, now); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar o atendimento" }, { status: 409 }); }
  } else if (action === "subscription-activate") {
    const startDate = String(body.startDate || new Date().toISOString().slice(0, 10));
    const end = new Date(`${startDate}T12:00:00`);
    end.setDate(end.getDate() + 30);
    await db.update(subscriptions).set({ status: "Ativa", startDate, endDate: end.toISOString().slice(0, 10) }).where(eq(subscriptions.id, Number(body.id)));
  } else if (action === "subscription-manage") {
    const id = Number(body.id);
    const operation = String(body.operation || "");
    const [current] = await db.select().from(subscriptions).where(eq(subscriptions.id, id)).limit(1);
    if (!current) return Response.json({ error: "Assinatura não encontrada" }, { status: 404 });
    if (operation === "extend") {
      const base = current.endDate && current.endDate >= new Date().toISOString().slice(0, 10) ? current.endDate : new Date().toISOString().slice(0, 10);
      const end = new Date(`${base}T12:00:00`);
      end.setDate(end.getDate() + 30);
      await db.update(subscriptions).set({ status: "Ativa", endDate: end.toISOString().slice(0, 10) }).where(eq(subscriptions.id, id));
    } else if (["Bloqueada", "Ativa", "Cancelada"].includes(operation)) await db.update(subscriptions).set({ status: operation }).where(eq(subscriptions.id, id));
    else if (operation === "message") {
      await db.update(subscriptions).set({ adminMessage: String(body.message || "").trim() }).where(eq(subscriptions.id, id));
      const internalMessage = String(body.message || "").trim();
      if (internalMessage) await db.insert(messages).values({ senderEmail: user.email, senderName: "Yuri Barbershop", recipientEmail: current.clientEmail, subject: "Mensagem sobre sua assinatura", body: internalMessage, createdAt: now });
    } else return Response.json({ error: "Operação inválida" }, { status: 400 });
  } else if (action === "collaborator-save") {
    const id = Number(body.id || 0);
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const percent = Math.max(0, Math.min(100, Math.round(Number(body.defaultCommissionPercent))));
    if (!name || !/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Informe nome e e-mail válidos" }, { status: 400 });
    if (id) {
      const [existing] = await db.select().from(collaborators).where(eq(collaborators.id, id)).limit(1);
      if (!existing) return Response.json({ error: "Colaborador não encontrado" }, { status: 404 });
      await db.update(collaborators).set({ name, email, phone: String(body.phone || ""), defaultCommissionPercent: percent, active: body.active !== false }).where(eq(collaborators.id, id));
      if (existing.email !== email) await db.update(accounts).set({ email }).where(eq(accounts.email, existing.email));
    } else {
      const password = String(body.password || "");
      if (password.length < 8) return Response.json({ error: "Crie uma senha temporária com pelo menos 8 caracteres" }, { status: 400 });
      await db.insert(collaborators).values({ email, name, phone: String(body.phone || ""), defaultCommissionPercent: percent, active: true, owner: false, createdAt: now });
      const passwordHash = await hashPassword(password);
      await db.insert(accounts).values({ email, passwordHash, role: "barber", active: true, createdAt: now }).onConflictDoUpdate({ target: accounts.email, set: { passwordHash, role: "barber", active: true } });
    }
  } else if (action === "collaborator-service") {
    const collaboratorId = Number(body.collaboratorId);
    const serviceId = Number(body.serviceId);
    const value = body.commissionPercent === "" || body.commissionPercent == null ? null : Math.max(0, Math.min(100, Math.round(Number(body.commissionPercent))));
    const [existing] = await db.select().from(collaboratorServices).where(and(eq(collaboratorServices.collaboratorId, collaboratorId), eq(collaboratorServices.serviceId, serviceId))).limit(1);
    if (existing) await db.update(collaboratorServices).set({ commissionPercent: value, active: body.active !== false }).where(eq(collaboratorServices.id, existing.id));
    else await db.insert(collaboratorServices).values({ collaboratorId, serviceId, commissionPercent: value, active: body.active !== false });
  } else if (action === "commission-settle") {
    const collaboratorId = Number(body.collaboratorId);
    const periodStart = String(body.periodStart);
    const periodEnd = String(body.periodEnd);
    const rows = await db.select().from(appointments).where(eq(appointments.collaboratorId, collaboratorId));
    const amountCents = rows.filter((item) => item.status === "Finalizado" && item.date >= periodStart && item.date <= periodEnd).reduce((sum, item) => sum + item.commissionCents, 0);
    await db.insert(commissionSettlements).values({ collaboratorId, periodStart, periodEnd, amountCents, note: String(body.note || ""), paidAt: now, createdAt: now });
  } else if (action === "schedule-block") {
    await db.insert(scheduleBlocks).values({ date: String(body.date), time: String(body.time || "Dia inteiro"), reason: String(body.reason || "Indisponível"), collaboratorId: body.collaboratorId ? Number(body.collaboratorId) : null, createdAt: now });
  } else if (action === "waitlist-status") {
    await db.update(waitlist).set({ status: String(body.status || "Atendido") }).where(eq(waitlist.id, Number(body.id)));
  } else if (action === "business-settings") {
    await db.insert(businessSettings).values({ id: 1, monthlyGoalCents: Math.round(Number(body.monthlyGoal) * 100), loyaltyTarget: Number(body.loyaltyTarget), loyaltyReward: String(body.loyaltyReward) }).onConflictDoUpdate({ target: businessSettings.id, set: { monthlyGoalCents: Math.round(Number(body.monthlyGoal) * 100), loyaltyTarget: Number(body.loyaltyTarget), loyaltyReward: String(body.loyaltyReward) } });
  } else if (action === "marketing-contact") {
    const key = String(body.key || "").trim();
    const clientEmail = String(body.clientEmail || "").trim().toLowerCase();
    if (!key || !clientEmail) return Response.json({ error: "Contato inválido" }, { status: 400 });
    await db.insert(marketingContacts).values({ key, clientEmail, campaign: String(body.campaign || "remarketing"), sentAt: String(body.sentAt || ""), answered: body.answered === true, returned: body.returned === true, updatedAt: now }).onConflictDoUpdate({ target: marketingContacts.key, set: { sentAt: String(body.sentAt || ""), answered: body.answered === true, returned: body.returned === true, updatedAt: now } });
  } else return Response.json({ error: "Ação inválida" }, { status: 400 });
  return Response.json({ ok: true });
}
