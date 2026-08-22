import { and, desc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "../../../db";
import { profiles, services, transactions } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

function moneyToCents(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function monthBounds(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const [year, monthNumber] = month.split("-").map(Number);
  const end = new Date(Date.UTC(year, monthNumber, 0));
  const lastDay = String(end.getUTCDate()).padStart(2, "0");
  return { start: `${month}-01`, end: `${month}-${lastDay}` };
}

async function requireAdmin() {
  const user = await getChatGPTUser();
  if (!user) return { error: Response.json({ error: "Não autorizado" }, { status: 401 }) } as const;
  if (user.role !== "admin") return { error: Response.json({ error: "Acesso restrito ao administrador" }, { status: 403 }) } as const;
  return { user } as const;
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const db = getDb();
  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year") || new Date().getFullYear());
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const [rows, serviceRows, clientRows] = await Promise.all([
    db.select().from(transactions).where(and(gte(transactions.date, start), lte(transactions.date, end))).orderBy(desc(transactions.date), desc(transactions.id)),
    db.select().from(services).where(eq(services.active, true)),
    db.select().from(profiles).orderBy(profiles.name),
  ]);
  return Response.json({ transactions: rows, services: serviceRows, clients: clientRows }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const db = getDb();
  const body = (await request.json()) as Record<string, unknown>;
  const action = String(body.action || "");
  const now = new Date().toISOString();

  if (action === "create") {
    const mode = body.mode === "month" ? "month" : "day";
    const kind = body.kind === "despesa" ? "despesa" : "entrada";
    const amountCents = moneyToCents(body.amount);
    if (amountCents === null || amountCents <= 0) return Response.json({ error: "Informe um valor maior que zero." }, { status: 400 });

    let date = String(body.date || "");
    let reference = date;
    if (mode === "month") {
      const month = String(body.month || "");
      const bounds = monthBounds(month);
      if (!bounds) return Response.json({ error: "Mês inválido." }, { status: 400 });
      date = bounds.start;
      reference = month;
    } else if (!validDate(date)) {
      return Response.json({ error: "Data inválida." }, { status: 400 });
    }

    const serviceId = body.serviceId ? Number(body.serviceId) : null;
    const [service] = serviceId ? await db.select().from(services).where(eq(services.id, serviceId)).limit(1) : [];
    const clientEmail = String(body.clientEmail || "").trim().toLowerCase();
    const [client] = clientEmail ? await db.select().from(profiles).where(eq(profiles.email, clientEmail)).limit(1) : [];
    const defaultDescription = mode === "month"
      ? `${kind === "entrada" ? "Faturamento" : "Despesas"} consolidadas — ${reference}`
      : `${kind === "entrada" ? "Faturamento" : "Despesa"} histórica — ${date}`;

    const [created] = await db.insert(transactions).values({
      kind,
      description: String(body.description || "").trim() || defaultDescription,
      amountCents,
      date,
      clientEmail: client?.email || "",
      clientName: client?.name || "",
      serviceId: service?.id || null,
      serviceName: service?.name || "",
      paymentMethod: String(body.paymentMethod || "Histórico").trim(),
      createdAt: now,
    }).returning();
    return Response.json({ ok: true, transaction: created });
  }

  if (action === "update") {
    const id = Number(body.id || 0);
    if (!id) return Response.json({ error: "Lançamento inválido." }, { status: 400 });
    const [current] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
    if (!current) return Response.json({ error: "Lançamento não encontrado." }, { status: 404 });
    const kind = body.kind === "despesa" ? "despesa" : "entrada";
    const amountCents = moneyToCents(body.amount);
    const date = String(body.date || "");
    if (amountCents === null || amountCents <= 0) return Response.json({ error: "Informe um valor maior que zero." }, { status: 400 });
    if (!validDate(date)) return Response.json({ error: "Data inválida." }, { status: 400 });
    const serviceId = body.serviceId ? Number(body.serviceId) : null;
    const [service] = serviceId ? await db.select().from(services).where(eq(services.id, serviceId)).limit(1) : [];
    const clientEmail = String(body.clientEmail || "").trim().toLowerCase();
    const [client] = clientEmail ? await db.select().from(profiles).where(eq(profiles.email, clientEmail)).limit(1) : [];
    await db.update(transactions).set({
      kind,
      description: String(body.description || current.description).trim(),
      amountCents,
      date,
      clientEmail: client?.email || "",
      clientName: client?.name || "",
      serviceId: service?.id || null,
      serviceName: service?.name || "",
      paymentMethod: String(body.paymentMethod || current.paymentMethod || "Histórico").trim(),
    }).where(eq(transactions.id, id));
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Ação inválida." }, { status: 400 });
}
