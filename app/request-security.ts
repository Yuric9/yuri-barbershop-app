export function rejectCrossSiteWrite(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return Response.json({ error: "Origem da requisição não permitida." }, { status: 403 });
  }

  const origin = request.headers.get("origin");
  if (!origin) return null;

  try {
    if (new URL(origin).origin !== new URL(request.url).origin) {
      return Response.json({ error: "Origem da requisição não permitida." }, { status: 403 });
    }
  } catch {
    return Response.json({ error: "Origem da requisição inválida." }, { status: 403 });
  }

  return null;
}
