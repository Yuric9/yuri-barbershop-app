"use client";

import { useEffect } from "react";

function normalize(value: string | null | undefined) {
  return String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
}

function ensurePreviewLink() {
  const active = normalize(document.querySelector<HTMLButtonElement>(".sidebar nav button.active")?.textContent);
  const existing = document.querySelector<HTMLAnchorElement>(".barber-preview-link");

  if (active !== "colaboradores") {
    existing?.remove();
    return;
  }

  const heading = [...document.querySelectorAll<HTMLElement>("h2")].find((node) => normalize(node.textContent) === "barbeiros colaboradores");
  const title = heading?.closest<HTMLElement>(".section-title");
  if (!title || existing) return;

  const link = document.createElement("a");
  link.href = "/barber-preview";
  link.className = "barber-preview-link";
  link.textContent = "◉ Visualizar painel do colaborador";
  link.setAttribute("aria-label", "Abrir pré-visualização segura do painel do colaborador");

  const actions = title.querySelector<HTMLElement>(".client-header-actions") || title.lastElementChild as HTMLElement | null;
  if (actions && actions !== heading?.parentElement) actions.appendChild(link);
  else title.appendChild(link);
}

export default function AdminBarberPreviewLink() {
  useEffect(() => {
    let scheduled = false;
    const scan = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        ensurePreviewLink();
      });
    };
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    scan();
    return () => {
      observer.disconnect();
      document.querySelector(".barber-preview-link")?.remove();
    };
  }, []);
  return null;
}
