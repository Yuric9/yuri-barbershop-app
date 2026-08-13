import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  appointments,
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
} from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { isAdminEmail } from "../../admin-access";

export const dynamic = "force-dynamic";
const defaults = [
  ["Corte", 3000, 60],
  ["Barba", 3000, 40],
  ["Corte + Barba", 5000, 90],
  ["Sobrancelha", 1500, 15],
  ["Pigmentação", 3000, 30],
] as const;

function allowedBookingTimes(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const day = new Date(`${date}T12:00:00`).getDay();
  const startMinutes = day === 0 || day === 6 ? 8 * 60 : 18 * 60;
  const endMinutes = day === 0 ? 12 * 60 : 20 * 60 + 30;
  const slots: string[] = [];
  for (let minutes = startMinutes; minutes <= endMinutes; minutes += 30) {
    slots.push(`${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`);
  }
  return slots;
}

function unauthorized() {
  return Response.json({ error: "Não autorizado" }, { status: 401 });
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

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  await seedServices();
  const db = getDb();
  const isAdmin = isAdminEmail(user.email);
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
  ] = await Promise.all([
    db.select().from(services).where(eq(services.active, true)),
    db.select().from(products).where(eq(products.active, true)),
    isAdmin
      ? db
          .select()
          .from(appointments)
          .orderBy(desc(appointments.date), desc(appointments.time))
      : db
          .select()
          .from(appointments)
          .where(eq(appointments.clientEmail, user.email))
          .orderBy(desc(appointments.date)),
    isAdmin
      ? db.select().from(profiles).orderBy(profiles.name)
      : db.select().from(profiles).where(eq(profiles.email, user.email)),
    isAdmin
      ? db.select().from(transactions).orderBy(desc(transactions.date))
      : Promise.resolve([]),
    db.select().from(promotions).where(eq(promotions.active, true)).orderBy(desc(promotions.id)),
    db.select().from(catalogItems).where(eq(catalogItems.active, true)).orderBy(desc(catalogItems.id)),
    isAdmin
      ? db.select().from(subscriptions).orderBy(desc(subscriptions.id))
      : db.select().from(subscriptions).where(eq(subscriptions.clientEmail, user.email)).orderBy(desc(subscriptions.id)),
    isAdmin
      ? db.select().from(messages).where(eq(messages.recipientEmail, "admin")).orderBy(desc(messages.id))
      : db.select().from(messages).where(eq(messages.recipientEmail, user.email)).orderBy(desc(messages.id)),
    isAdmin ? db.select().from(reviews).orderBy(desc(reviews.id)) : db.select().from(reviews).where(eq(reviews.clientEmail, user.email)).orderBy(desc(reviews.id)),
    isAdmin ? db.select().from(waitlist).orderBy(desc(waitlist.id)) : db.select().from(waitlist).where(eq(waitlist.clientEmail, user.email)).orderBy(desc(waitlist.id)),
    db.select().from(scheduleBlocks).orderBy(desc(scheduleBlocks.date)),
    db.select().from(businessSettings).limit(1),
    db.select().from(subscriptionCampaigns).where(eq(subscriptionCampaigns.active, true)).orderBy(desc(subscriptionCampaigns.id)),
    isAdmin ? db.select().from(marketingContacts).orderBy(desc(marketingContacts.updatedAt)) : Promise.resolve([]),
  ]);
  const selectedDate = new URL(request.url).searchParams.get("date");
  const occupiedTimes = selectedDate
    ? (
        await db
          .select({ time: appointments.time })
          .from(appointments)
          .where(eq(appointments.date, selectedDate))
      ).map((row) => row.time)
    : [];
  const today = new Date().toISOString().slice(0, 10);
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
        const subscriptionStatus = subscription?.status === "Ativa" && subscription.endDate && subscription.endDate < today
          ? "Vencida"
          : subscription?.status || "Sem assinatura";
        return {
          ...profile,
          appointmentsCount: history.length,
          finalizedCount: finalized.length,
          loyaltyRewards: Math.floor(finalized.length / 10),
          totalSpentCents: history.reduce((sum, item) => sum + item.totalCents, 0),
          lastVisit: lastAppointment?.date || null,
          lastService: lastAppointment?.serviceName || null,
          lastStatus: lastAppointment?.status || null,
          daysSinceLastVisit,
          needsRemarketing: daysSinceLastVisit !== null && daysSinceLastVisit >= 15,
          subscriptionStatus,
          subscriptionEndDate: subscription?.endDate || null,
        };
      })
    : [];
  return Response.json({
    isAdmin,
    services: serviceRows,
    products: productRows,
    appointments: appointmentRows,
    profiles: profileRows,
    transactions: transactionRows,
    occupiedTimes,
    clientSummaries,
    promotions: promotionRows,
    catalogItems: catalogRows,
    subscriptions: subscriptionRows,
    messages: messageRows,
    reviews: reviewRows,
    waitlist: waitlistRows,
    scheduleBlocks: blockRows,
    settings: settingsRows[0] || { monthlyGoalCents: 500000, loyaltyTarget: 10, loyaltyReward: "1 atendimento grátis" },
    subscriptionCampaigns: subscriptionCampaignRows,
    marketingContacts: marketingContactRows,
  });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  const db = getDb();
  const body = (await request.json()) as Record<string, unknown>;
  const action = String(body.action || "");
  const isAdmin = isAdminEmail(user.email);
  const now = new Date().toISOString();

  if (action === "profile") {
    const name = String(body.name || user.displayName).trim();
    await db
      .insert(profiles)
      .values({
        email: user.email,
        name,
        phone: String(body.phone || ""),
        birthDate: String(body.birthDate || ""),
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: profiles.email,
        set: {
          name,
          phone: String(body.phone || ""),
          birthDate: String(body.birthDate || ""),
        },
      });
    return Response.json({ ok: true });
  }
  if (action === "appointment") {
    const serviceId = Number(body.serviceId);
    const [service] = await db
      .select()
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.active, true)))
      .limit(1);
    if (!service)
      return Response.json({ error: "Serviço inválido" }, { status: 400 });
    const productId = body.productId ? Number(body.productId) : null;
    const [product] = productId
      ? await db
          .select()
          .from(products)
          .where(and(eq(products.id, productId), eq(products.active, true)))
          .limit(1)
      : [undefined];
    const date = String(body.date || "");
    const time = String(body.time || "");
    if (!date || !time)
      return Response.json(
        { error: "Escolha uma data e um horário" },
        { status: 400 },
      );
    if (!allowedBookingTimes(date).includes(time))
      return Response.json(
        { error: "Horário fora do funcionamento da Yuri Barbershop" },
        { status: 400 },
      );
    const conflict = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(and(eq(appointments.date, date), eq(appointments.time, time)))
      .limit(1);
    if (conflict.length)
      return Response.json(
        { error: "Este horário acabou de ser reservado. Escolha outro." },
        { status: 409 },
      );
    const profile = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, user.email))
      .limit(1);
    const [created] = await db
      .insert(appointments)
      .values({
        clientEmail: user.email,
        clientName: profile[0]?.name || user.displayName,
        serviceId,
        serviceName: service.name,
        productId: product?.id,
        productName: product?.name,
        date,
        time,
        totalCents: service.priceCents + (product?.priceCents || 0),
        createdAt: now,
      })
      .returning();
    return Response.json({ ok: true, appointment: created });
  }
  if (action === "subscription-request") {
    const existing = await db.select().from(subscriptions).where(eq(subscriptions.clientEmail, user.email));
    if (existing.some((item) => item.status === "Ativa" || item.status === "Aguardando pagamento"))
      return Response.json({ error: "Você já possui uma assinatura ativa ou em análise." }, { status: 409 });
    const profile = await db.select().from(profiles).where(eq(profiles.email, user.email)).limit(1);
    await db.insert(subscriptions).values({
      clientEmail: user.email,
      clientName: profile[0]?.name || user.displayName,
      createdAt: now,
    });
    return Response.json({ ok: true });
  }
  if (action === "message-send") {
    const subject = String(body.subject || "Mensagem").trim();
    const messageBody = String(body.body || "").trim();
    if (!messageBody) return Response.json({ error: "Escreva uma mensagem" }, { status: 400 });
    const recipientEmail = isAdmin ? String(body.recipientEmail || "").trim().toLowerCase() : "admin";
    if (!recipientEmail) return Response.json({ error: "Escolha um cliente" }, { status: 400 });
    await db.insert(messages).values({
      senderEmail: user.email,
      senderName: isAdmin ? "Yuri Barbershop" : user.displayName,
      recipientEmail,
      subject,
      body: messageBody,
      createdAt: now,
    });
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
  if (!isAdmin) return forbidden();
  if (action === "service") {
    await db
      .insert(services)
      .values({
        name: String(body.name),
        priceCents: Math.round(Number(body.price) * 100),
        durationMin: Number(body.duration),
      });
  } else if (action === "service-update") {
    const name = String(body.name || "").trim();
    const priceCents = Math.round(Number(body.price) * 100);
    const durationMin = Number(body.duration);
    if (!name || priceCents <= 0 || durationMin < 5)
      return Response.json({ error: "Dados do serviço inválidos" }, { status: 400 });
    await db.update(services).set({ name, priceCents, durationMin, active: body.active !== false }).where(eq(services.id, Number(body.id)));
  } else if (action === "product") {
    await db
      .insert(products)
      .values({
        name: String(body.name),
        description: String(body.description || ""),
        priceCents: Math.round(Number(body.price) * 100),
        stock: Number(body.stock || 0),
        imageKey: String(body.imageKey || ""),
        featured: body.featured === true,
        showOnLogin: body.showOnLogin === true,
      });
  } else if (action === "promotion") {
    await db.insert(promotions).values({
      title: String(body.title || "").trim(),
      description: String(body.description || "").trim(),
      validUntil: String(body.validUntil || ""),
      imageKey: String(body.imageKey || ""),
      showOnLogin: body.showOnLogin === true,
      createdAt: now,
    });
  } else if (action === "product-campaign") {
    await db.update(products).set({ featured: body.featured === true, showOnLogin: body.showOnLogin === true }).where(eq(products.id, Number(body.id)));
  } else if (action === "subscription-campaign") {
    await db.insert(subscriptionCampaigns).values({ title: String(body.title || "Clube Yuri").trim(), description: String(body.description || "").trim(), imageKey: String(body.imageKey || ""), showOnLogin: body.showOnLogin === true, createdAt: now });
  } else if (action === "catalog-item") {
    await db.insert(catalogItems).values({
      name: String(body.name || "").trim(),
      category: String(body.category || "corte"),
      description: String(body.description || "").trim(),
      imageKey: String(body.imageKey || ""),
      createdAt: now,
    });
  } else if (action === "transaction") {
    await db
      .insert(transactions)
      .values({
        kind: String(body.kind),
        description: String(body.description),
        amountCents: Math.round(Number(body.amount) * 100),
        date: String(body.date),
        createdAt: now,
      });
  } else if (action === "appointment-status") {
    await db
      .update(appointments)
      .set({ status: String(body.status), adminMessage: String(body.message || "") })
      .where(eq(appointments.id, Number(body.id)));
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, Number(body.id))).limit(1);
    const internalMessage = String(body.message || "").trim();
    if (appointment && internalMessage) await db.insert(messages).values({ senderEmail: user.email, senderName: "Yuri Barbershop", recipientEmail: appointment.clientEmail, subject: `Atualização do agendamento: ${appointment.serviceName}`, body: internalMessage, createdAt: now });
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
      const end = new Date(`${base}T12:00:00`); end.setDate(end.getDate() + 30);
      await db.update(subscriptions).set({ status: "Ativa", endDate: end.toISOString().slice(0, 10) }).where(eq(subscriptions.id, id));
    } else if (["Bloqueada", "Ativa", "Cancelada"].includes(operation)) {
      await db.update(subscriptions).set({ status: operation }).where(eq(subscriptions.id, id));
    } else if (operation === "message") {
      await db.update(subscriptions).set({ adminMessage: String(body.message || "").trim() }).where(eq(subscriptions.id, id));
      const internalMessage = String(body.message || "").trim();
      if (internalMessage) await db.insert(messages).values({ senderEmail: user.email, senderName: "Yuri Barbershop", recipientEmail: current.clientEmail, subject: "Mensagem sobre sua assinatura", body: internalMessage, createdAt: now });
    } else return Response.json({ error: "Operação inválida" }, { status: 400 });
  } else if (action === "schedule-block") {
    await db.insert(scheduleBlocks).values({ date: String(body.date), time: String(body.time || "Dia inteiro"), reason: String(body.reason || "Indisponível"), createdAt: now });
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
