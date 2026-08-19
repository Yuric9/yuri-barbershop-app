"use client";

import { useEffect } from "react";

function normalize(value: string | null | undefined) {
  return String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
}

function ensureAdminBarberLink() {
  const sidebar = document.querySelector<HTMLElement>(".sidebar");
  if (!sidebar) return;
  const text = normalize(sidebar.textContent);
  const isAdmin = text.includes("administrador") && text.includes("ir para agendamento");
  let link = sidebar.querySelector<HTMLAnchorElement>(".barber-preview-link");

  if (!isAdmin) {
    link?.remove();
    return;
  }

  if (!link) {
    link = document.createElement("a");
    link.href = "/barber-preview";
    link.className = "logout-button portal-switch-button barber-preview-link";
    link.innerHTML = "<span>✂</span> Ir para painel do colaborador";
    link.setAttribute("aria-label", "Abrir o ambiente completo do colaborador");

    const switchButton = [...sidebar.querySelectorAll<HTMLElement>(".portal-switch-button")]
      .find((element) => normalize(element.textContent).includes("ir para agendamento"));
    if (switchButton) switchButton.insertAdjacentElement("afterend", link);
    else sidebar.querySelector(".sidebar-user")?.insertAdjacentElement("afterend", link);
  }
}

export default function AdminBarberPreviewLink() {
  useEffect(() => {
    let scheduled = false;
    const scan = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        ensureAdminBarberLink();
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
