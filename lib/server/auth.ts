import { getSessionUser, type SessionUser } from "./session";

export type { SessionUser };

export const ADMIN_ROLE = "admin";

/** Usuário logado (ou `null`). Use em páginas e rotas do servidor. */
export async function getCurrentUser() {
  return getSessionUser();
}

export function isAdmin(user: SessionUser | null): user is SessionUser {
  return user?.role === ADMIN_ROLE;
}
