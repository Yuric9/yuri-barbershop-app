"use client";

import { useEffect } from "react";

function normalize(value: string | null | undefined) {
  return String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
}

function isAdminSidebarVisible() {
  const sidebar = document.querySelector<HTMLElement>(".sidebar");
  if (!sidebar) return false;
  const text = normalize(sidebar.textContent);
  return text.includes("assinaturas") && text.includes("administrador");
}

function removeLegacyClubAdminPreview() {
  if (!isAdminSidebarVisible()) return false;

  let changed = false;

  // O Clube Yuri no perfil administrativo deve existir somente dentro de
  // Administração > Assinaturas. Remove qualquer atalho legado direto no menu.
  document.querySelectorAll<HTMLButtonElement>(".sidebar nav button").forEach((button) => {
    if (normalize(button.textContent) === "clube yuri") {
      button.remove();
      changed = true;
    }
  });

  // Versões antigas exibiam um painel fixo "VISÃO COMO" com o botão
  // "Ver Clube Yuri como cliente". Ele não faz mais parte do fluxo do Admin.
  const clubShortcut = [...document.querySelectorAll<HTMLElement>("button, a")].find((node) =>
    normalize(node.textContent).includes("ver clube yuri como cliente"),
  );

  if (clubShortcut) {
    let candidate: HTMLElement | null = clubShortcut;
    while (candidate && candidate !== document.body) {
      const text = normalize(candidate.textContent);
      if (text.includes("visão como") && text.includes("administrador")) {
        candidate.remove();
        changed = true;
        break;
      }
      candidate = candidate.parentElement;
    }

    if (!changed && clubShortcut.isConnected) {
      clubShortcut.remove();
      changed = true;
    }
  }

  return changed;
}

export default function AdminClubPreviewCleanup() {
  useEffect(() => {
    let done = removeLegacyClubAdminPreview();
    if (done) return;

    const observer = new MutationObserver(() => {
      if (removeLegacyClubAdminPreview()) {
        done = true;
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => observer.disconnect(), 12_000);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, []);

  return null;
}
