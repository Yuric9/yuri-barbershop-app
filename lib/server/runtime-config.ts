/**
 * Configuração injetada pelo Worker (ver `worker/index.ts`) a partir das
 * variáveis e segredos da Cloudflare. Nunca grave senhas no código.
 */
type YuriRuntime = typeof globalThis & {
  __YURI_ADMIN_EMAIL?: string;
  __YURI_ADMIN_PASSWORD_HASH?: string;
};

export function adminRuntimeConfig() {
  const runtime = globalThis as YuriRuntime;
  return {
    email: (runtime.__YURI_ADMIN_EMAIL || "").trim().toLowerCase(),
    passwordHash: runtime.__YURI_ADMIN_PASSWORD_HASH || "",
  };
}
