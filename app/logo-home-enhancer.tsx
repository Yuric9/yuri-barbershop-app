"use client";

import { useEffect } from "react";

function findPortalHomeButton() {
  const sidebar = document.querySelector<HTMLElement>(".sidebar");
  if (!sidebar) return null;

  const buttons = [...sidebar.querySelectorAll<HTMLButtonElement>("nav button")];
  if (!buttons.length) return null;

  const normalized = (value: string | null | undefined) =>
    String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");

  return (
    buttons.find((button) => ["início", "inicio", "meu painel", "agendar"].includes(normalized(button.textContent))) ||
    buttons[0]
  );
}

export default function LogoHomeEnhancer() {
  useEffect(() => {
    const goHome = (target: HTMLElement | null, event: Event) => {
      const brand = target?.closest<HTMLElement>(".sidebar .brand, .sidebar .brand-home, .sidebar .brand-mark");
      if (!brand) return false;

      const homeButton = findPortalHomeButton();
      if (!homeButton) return false;

      event.preventDefault();
      homeButton.click();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return true;
    };

    const onClick = (event: MouseEvent) => {
      goHome(event.target as HTMLElement | null, event);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      goHome(event.target as HTMLElement | null, event);
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);

    document.querySelectorAll<HTMLElement>(".sidebar .brand:not(button):not(a), .sidebar .brand-mark").forEach((node) => {
      if (node.closest("button, a")) return;
      node.setAttribute("role", "button");
      node.setAttribute("tabindex", "0");
      node.setAttribute("aria-label", "Voltar ao início");
    });

    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  return null;
}
