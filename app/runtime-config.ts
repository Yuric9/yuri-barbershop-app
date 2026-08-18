type YuriRuntime = typeof globalThis & {
  __YURI_ADMIN_EMAIL?: string;
  __YURI_ADMIN_PASSWORD_HASH?: string;
  __YURI_MP_WEBHOOK_SECRET?: string;
  __YURI_MP_ACCESS_TOKEN?: string;
};

export function adminRuntimeConfig() {
  const runtime = globalThis as YuriRuntime;
  return {
    email: (runtime.__YURI_ADMIN_EMAIL || "yure-c@hotmail.com").trim().toLowerCase(),
    passwordHash: runtime.__YURI_ADMIN_PASSWORD_HASH || "",
  };
}

export function mercadoPagoRuntimeConfig() {
  const runtime = globalThis as YuriRuntime;
  return {
    webhookSecret: runtime.__YURI_MP_WEBHOOK_SECRET || "",
    accessToken: runtime.__YURI_MP_ACCESS_TOKEN || "",
  };
}
