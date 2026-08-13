type YuriRuntime = typeof globalThis & {
  __YURI_ADMIN_EMAIL?: string;
  __YURI_ADMIN_PASSWORD_HASH?: string;
};

export function adminRuntimeConfig() {
  const runtime = globalThis as YuriRuntime;
  return {
    email: (runtime.__YURI_ADMIN_EMAIL || "yure-c@hotmail.com").trim().toLowerCase(),
    passwordHash: runtime.__YURI_ADMIN_PASSWORD_HASH || "",
  };
}
