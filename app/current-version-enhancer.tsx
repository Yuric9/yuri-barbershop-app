"use client";

import { useEffect } from "react";

const norm = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function simplifyNavigation() {
  document.querySelectorAll<HTMLElement>(".sidebar nav").forEach((nav) => {
    const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>("button"));
    if (!buttons.length) return;
    const labels = buttons.map((button) => norm(button.textContent || ""));
    const admin = labels.some((label) => /dashboard|relatorio|caixa|clientes|agenda/.test(label));

    buttons.forEach((button) => {
      const label = norm(button.textContent || "");
      if (admin) {
        const legacy = /promoc|assinatur|crescimento|catalog/.test(label);
        button.classList.toggle("current-version-hidden-nav", legacy);
        return;
      }
      const keep = /inicio|agend|produto|horario|sair|conta|perfil/.test(label);
      button.classList.toggle("current-version-hidden-nav", !keep);
    });
  });
}

function installHomeButton() {
  const header = document.querySelector<HTMLElement>(".mobile-flow-header");
  if (!header || header.querySelector(".current-version-home")) return;
  const back = header.querySelector<HTMLButtonElement>('button[aria-label="Voltar uma etapa"]');
  if (!back) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "current-version-home";
  button.textContent = "← Início";
  button.setAttribute("aria-label", "Voltar ao início do agendamento");
  button.addEventListener("click", () => {
    let tries = 0;
    const returnHome = () => {
      const currentHeader = document.querySelector<HTMLElement>(".mobile-flow-header");
      if (!currentHeader || tries >= 12) return;
      const currentBack = currentHeader.querySelector<HTMLButtonElement>('button[aria-label="Voltar uma etapa"]');
      if (!currentBack) return;
      currentBack.click();
      tries += 1;
      window.setTimeout(returnHome, 70);
    };
    returnHome();
  });
  header.appendChild(button);
}

function applyCurrentScope() {
  simplifyNavigation();
  installHomeButton();
  document.documentElement.classList.add("yuri-current-version");
}

export default function CurrentVersionEnhancer() {
  useEffect(() => {
    applyCurrentScope();
    const observer = new MutationObserver(applyCurrentScope);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("yuri-current-version");
    };
  }, []);
  return null;
}
