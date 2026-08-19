"use client";

import { useEffect } from "react";

function normalize(value: string | null | undefined) {
  return String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
}

function isBarberPortal() {
  const sidebar = document.querySelector<HTMLElement>(".sidebar");
  if (!sidebar) return false;
  const text = normalize(sidebar.textContent);
  return text.includes("barbeiro colaborador") || (text.includes("meu painel") && text.includes("meus ganhos") && text.includes("minha agenda"));
}

function activeSectionLabel() {
  return normalize(document.querySelector<HTMLButtonElement>(".sidebar nav button.active")?.textContent);
}

function ensureRoleBanner() {
  const shell = document.querySelector<HTMLElement>(".app-shell");
  const content = shell?.querySelector<HTMLElement>(".app-content");
  const header = content?.querySelector<HTMLElement>(".app-header");
  if (!shell || !content || !header) return;

  if (!isBarberPortal()) {
    shell.classList.remove("barber-portal");
    content.querySelector(".barber-role-banner")?.remove();
    return;
  }

  shell.classList.add("barber-portal");
  let banner = content.querySelector<HTMLElement>(".barber-role-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.className = "barber-role-banner";
    header.insertAdjacentElement("afterend", banner);
  }

  const section = activeSectionLabel();
  const descriptions: Record<string, string> = {
    "meu painel": "Acompanhe seu dia, próximos clientes e ganhos do seu trabalho.",
    "caixa de entrada": "Mensagens relacionadas aos seus atendimentos e à equipe.",
    "minha agenda": "Somente os horários e clientes atribuídos a você.",
    "meus ganhos": "Comissões e atendimentos finalizados vinculados ao seu perfil.",
    "meu perfil": "Seus dados profissionais e informações da função.",
  };

  banner.innerHTML = `<div><small>✂ ÁREA DO COLABORADOR</small><strong>${section ? section.replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()) : "Painel"}</strong><span>${descriptions[section] || "Área restrita às informações da sua função."}</span></div><em>ACESSO RESTRITO</em>`;
}

export default function BarberExperience() {
  useEffect(() => {
    let scheduled = false;
    const scan = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        ensureRoleBanner();
      });
    };

    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    scan();

    return () => {
      observer.disconnect();
      document.querySelector(".app-shell")?.classList.remove("barber-portal");
      document.querySelector(".barber-role-banner")?.remove();
    };
  }, []);

  return null;
}
