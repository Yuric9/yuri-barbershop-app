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
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const brand = target?.closest<HTMLElement>(".sidebar .brand, .sidebar .brand-home, .sidebar .brand-mark");
      if (!brand) return;

      const homeButton = findPortalHomeButton();
      if (!homeButton) return;

      event.preventDefault();
      homeButton.click();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target as HTMLElement | null;
      const brand = target?.closest<HTMLElement>(".sidebar .brand, .sidebar .brand-home, .sidebar .brand-mark");
      if (!brand) return;

      const homeButton = findPortalHomeButton();
      if (!homeButton) return;

      event.preventDefault();
      homeButton.click();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);

    const enhanceAccessibility = () => {
      document.querySelectorAll<HTMLElement>(".sidebar .brand:not(button):not(a), .sidebar .brand-mark").forEach((node) => {
        if (node.closest("button, a")) return;
        node.setAttribute("role", "button");
        node.setAttribute("tabindex", "0");
        node.setAttribute("aria-label", "Voltar ao início");
      });
    };

    enhanceAccessibility();
    const observer = new MutationObserver(enhanceAccessibility);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  return null;
}
