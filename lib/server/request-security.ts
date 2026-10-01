/**
 * Bloqueia escritas (POST/PATCH/DELETE) vindas de outros sites.
 * Retorna uma resposta de erro ou `null` quando a origem é a própria aplicação.
 */
export function rejectCrossSiteWrite(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return Response.json({ error: "Origem da requisição não permitida." }, { status: 403 });
  }
  const origin = request.headers.get("origin");
  if (!origin) return null;
  try {
    if (new URL(origin).origin === new URL(request.url).origin) return null;
  } catch {
    // Origem malformada: cai na rejeição abaixo.
  }
  return Response.json({ error: "Origem da requisição não permitida." }, { status: 403 });
}
