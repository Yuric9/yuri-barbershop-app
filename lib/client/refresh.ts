/**
 * Endereços da API que precisam ser recarregados depois de cada tipo de
 * alteração (usados com `useAction({ refresh })`).
 */
export const REFRESH = {
  agenda: ["/api/appointments", "/api/dashboard", "/api/clients", "/api/transactions", "/api/collaborators"],
  finance: ["/api/transactions", "/api/dashboard", "/api/collaborators", "/api/appointments", "/api/clients"],
  clients: ["/api/clients"],
  services: ["/api/services", "/api/appointments/availability"],
  products: ["/api/products", "/api/product-orders", "/api/transactions", "/api/dashboard"],
  team: ["/api/collaborators", "/api/appointments/availability"],
  marketing: ["/api/marketing-contacts"],
} as const satisfies Record<string, readonly string[]>;
