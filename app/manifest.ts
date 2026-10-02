import type { MetadataRoute } from "next";

/** Manifesto do app: permite instalar o painel na tela inicial do celular. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Yuri Barbershop — Gestão",
    short_name: "Yuri Gestão",
    description: "Gestão da Yuri Barbershop: agenda, caixa, clientes e relatórios.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#14130f",
    theme_color: "#14130f",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Agenda", url: "/#agenda", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Caixa", url: "/#caixa", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
