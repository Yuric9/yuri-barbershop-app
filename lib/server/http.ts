/**
 * Utilitários das rotas de API.
 *
 * `adminRoute` concentra o que toda rota administrativa precisa:
 * - bloqueia escritas vindas de outros sites;
 * - exige um usuário administrador logado;
 * - converte erros de validação (`zod`) e `ApiError` em respostas JSON;
 * - registra erros inesperados sem expor detalhes ao navegador.
 */
import { z } from "zod";
import { getCurrentUser, isAdmin, type SessionUser } from "./auth";
import { rejectCrossSiteWrite } from "./request-security";

/** Erro esperado, com mensagem amigável para o usuário. */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const notFound = (what: string) => new ApiError(404, `${what} não encontrado.`);

const NO_STORE = { "cache-control": "no-store" };

export function ok<T>(data: T, status = 200) {
  return Response.json(data, { status, headers: NO_STORE });
}

function errorResponse(status: number, message: string) {
  return Response.json({ error: message }, { status, headers: NO_STORE });
}

type RouteContext<P> = { params: Promise<P> };
type AdminHandler<P> = (input: { request: Request; user: SessionUser; params: P }) => Promise<Response>;

export function adminRoute<P = Record<string, never>>(handler: AdminHandler<P>) {
  return async (request: Request, context?: RouteContext<P>) => {
    try {
      if (request.method !== "GET") {
        const crossSite = rejectCrossSiteWrite(request);
        if (crossSite) return crossSite;
      }
      const user = await getCurrentUser();
      if (!user) return errorResponse(401, "Sua sessão expirou. Entre novamente.");
      if (!isAdmin(user)) return errorResponse(403, "Acesso restrito ao administrador.");
      const params = context ? await context.params : ({} as P);
      return await handler({ request, user, params });
    } catch (error) {
      if (error instanceof ApiError) return errorResponse(error.status, error.message);
      if (error instanceof z.ZodError) return errorResponse(400, error.issues[0]?.message || "Dados inválidos.");
      console.error("api-error", request.method, new URL(request.url).pathname, error);
      return errorResponse(500, "Não foi possível concluir a operação. Tente novamente.");
    }
  };
}

/** Lê e valida o corpo JSON da requisição. */
export async function readBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "Corpo da requisição inválido.");
  }
  return schema.parse(body);
}

export function idParam(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "Identificador inválido.");
  return id;
}
