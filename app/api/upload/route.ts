import { adminRoute, ApiError, ok } from "../../../lib/server/http";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
/** Somente imagens enviadas pelo sistema podem ser lidas. */
const IMAGE_KEY = /^catalog\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

function bucket() {
  const binding = (globalThis as typeof globalThis & { __YURI_BUCKET?: R2Bucket }).__YURI_BUCKET;
  if (!binding) throw new Error("Armazenamento de imagens (R2) indisponível.");
  return binding;
}

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!IMAGE_KEY.test(key)) return new Response("Imagem inválida", { status: 400 });
  const object = await bucket().get(key);
  if (!object) return new Response("Imagem não encontrada", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=86400, immutable");
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}

export const POST = adminRoute(async ({ request }) => {
  const file = (await request.formData()).get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Selecione uma imagem.");
  const extension = ALLOWED_TYPES.get(file.type);
  if (!extension || file.size <= 0 || file.size > MAX_BYTES) {
    throw new ApiError(400, "Use uma imagem JPEG, PNG ou WebP de até 5 MB.");
  }
  const key = `catalog/${crypto.randomUUID()}.${extension}`;
  await bucket().put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  return ok({ key }, 201);
});
