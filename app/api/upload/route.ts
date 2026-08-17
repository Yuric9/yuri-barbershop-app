import { getChatGPTUser } from "../../chatgpt-auth";
import { rejectCrossSiteWrite } from "../../request-security";

export const dynamic = "force-dynamic";

const ALLOWED_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function bucket() {
  const binding = (globalThis as typeof globalThis & { __YURI_BUCKET?: R2Bucket }).__YURI_BUCKET;
  if (!binding) throw new Error("Armazenamento de imagens indisponível");
  return binding;
}

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key) return new Response("Imagem não informada", { status: 400 });
  const object = await bucket().get(key);
  if (!object) return new Response("Imagem não encontrada", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=86400");
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}

export async function POST(request: Request) {
  const originError = rejectCrossSiteWrite(request);
  if (originError) return originError;

  const user = await getChatGPTUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Não autorizado" }, { status: 403 });
  }

  const data = await request.formData();
  const file = data.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Selecione uma imagem" }, { status: 400 });
  }

  const extension = ALLOWED_IMAGE_TYPES.get(file.type);
  if (!extension || file.size <= 0 || file.size > 5 * 1024 * 1024) {
    return Response.json(
      { error: "Use uma imagem JPEG, PNG ou WebP de até 5 MB" },
      { status: 400 },
    );
  }

  const key = `catalog/${crypto.randomUUID()}.${extension}`;
  await bucket().put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });
  return Response.json({ key, url: `/api/upload?key=${encodeURIComponent(key)}` });
}
