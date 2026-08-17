import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { catalogItems } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { rejectCrossSiteWrite } from "../../request-security";

export const dynamic = "force-dynamic";

function forbidden() {
  return Response.json({ error: "Acesso restrito ao administrador" }, { status: 403 });
}

export async function POST(request: Request) {
  const originError = rejectCrossSiteWrite(request);
  if (originError) return originError;

  const user = await getChatGPTUser();
  if (!user || user.role !== "admin") return forbidden();

  const body = (await request.json()) as Record<string, unknown>;
  const action = String(body.action || "");
  const id = Number(body.id || 0);
  if (!id) return Response.json({ error: "Modelo inválido" }, { status: 400 });

  const db = getDb();
  const [current] = await db.select().from(catalogItems).where(eq(catalogItems.id, id)).limit(1);
  if (!current) return Response.json({ error: "Modelo não encontrado" }, { status: 404 });

  if (action === "delete") {
    await db.update(catalogItems).set({ active: false }).where(eq(catalogItems.id, id));
    return Response.json({ ok: true });
  }

  if (action === "update") {
    const name = String(body.name || "").trim();
    const category = String(body.category || "corte").trim();
    const description = String(body.description || "").trim();
    const imageKey = String(body.imageKey || current.imageKey).trim();

    if (!name) return Response.json({ error: "Informe o nome do modelo" }, { status: 400 });
    if (!["corte", "barba", "quimica"].includes(category)) {
      return Response.json({ error: "Categoria inválida" }, { status: 400 });
    }
    if (!imageKey) return Response.json({ error: "A foto do modelo é obrigatória" }, { status: 400 });

    await db.update(catalogItems).set({
      name: name.slice(0, 120),
      category,
      description: description.slice(0, 1000),
      imageKey,
      active: true,
    }).where(eq(catalogItems.id, id));

    return Response.json({ ok: true });
  }

  return Response.json({ error: "Ação inválida" }, { status: 400 });
}
