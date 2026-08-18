import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { products } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { rejectCrossSiteWrite } from "../../request-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const crossSite = rejectCrossSiteWrite(request);
  if (crossSite) return crossSite;

  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 });
  if (user.role !== "admin") return Response.json({ error: "Acesso restrito ao administrador" }, { status: 403 });

  const body = (await request.json()) as Record<string, unknown>;
  const id = Number(body.id);
  const name = String(body.name || "").trim();
  const description = String(body.description || "").trim();
  const price = Number(body.price);
  const stock = Number(body.stock);
  const imageKey = String(body.imageKey || "").trim();

  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Produto inválido" }, { status: 400 });
  if (!name || !Number.isFinite(price) || price <= 0) return Response.json({ error: "Informe nome e preço válidos" }, { status: 400 });
  if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) return Response.json({ error: "Informe um estoque válido" }, { status: 400 });
  if (name.length > 120 || description.length > 1200 || imageKey.length > 500) return Response.json({ error: "Dados do produto excedem o limite permitido" }, { status: 400 });

  const db = getDb();
  const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!existing) return Response.json({ error: "Produto não encontrado" }, { status: 404 });

  await db.update(products).set({
    name,
    description,
    priceCents: Math.round(price * 100),
    stock,
    imageKey: imageKey || existing.imageKey,
    featured: body.featured === true,
    showOnLogin: body.showOnLogin === true,
  }).where(eq(products.id, id));

  return Response.json({ ok: true });
}
