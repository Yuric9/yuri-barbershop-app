import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { profiles, services, transactions } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";

export const dynamic = "force-dynamic";

function localToday() {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";
  return `${year}-${month}-${day}`;
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 });
  if (user.role !== "admin") return Response.json({ error: "Acesso restrito ao administrador" }, { status: 403 });

  const body = (await request.json()) as Record<string, unknown>;
  const kind = String(body.kind || "").toLowerCase();
  const description = String(body.description || "").trim();
  const amount = Number(body.amount || 0);

  if (!["entrada", "despesa"].includes(kind)) {
    return Response.json({ error: "Tipo de movimentação inválido" }, { status: 400 });
  }
  if (!description || !Number.isFinite(amount) || amount <= 0) {
    return Response.json({ error: "Informe descrição e valor maior que zero" }, { status: 400 });
  }

  const db = getDb();
  const serviceId = body.serviceId ? Number(body.serviceId) : null;
  const [linkedService] = serviceId
    ? await db.select().from(services).where(eq(services.id, serviceId)).limit(1)
    : [];

  const clientEmail = String(body.clientEmail || "").trim().toLowerCase();
  const [linkedClient] = clientEmail
    ? await db.select().from(profiles).where(eq(profiles.email, clientEmail)).limit(1)
    : [];

  const [created] = await db.insert(transactions).values({
    kind,
    description,
    amountCents: Math.round(amount * 100),
    date: localToday(),
    clientEmail: linkedClient?.email || "",
    clientName: linkedClient?.name || "",
    serviceId: linkedService?.id || null,
    serviceName: linkedService?.name || "",
    collaboratorId: body.collaboratorId ? Number(body.collaboratorId) : null,
    paymentMethod: String(body.paymentMethod || ""),
    createdAt: new Date().toISOString(),
  }).returning();

  return Response.json({ ok: true, transaction: created, dateLocked: true });
}
