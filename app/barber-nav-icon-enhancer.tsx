"use client";

import { useEffect } from "react";

const svg: Record<string, string> = {
  "meu painel": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  "caixa de entrada": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4zM4 7l8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  "minha agenda": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v15H5zM8 3v4m8-4v4M5 9h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  "meus ganhos": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17l5-5 4 3 7-8M16 7h4v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  "meu perfil": '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
};

function normalize(value: string | null | undefined) {
  return String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
}

function apply() {
  const previewButtons = [...document.querySelectorAll<HTMLButtonElement>(".barber-preview-sidebar nav button")];
  const actualBarber = [...document.querySelectorAll<HTMLButtonElement>(".sidebar nav button")].filter((button) => svg[normalize(button.textContent)]);
  [...previewButtons, ...actualBarber].forEach((button) => {
    const key = normalize(button.textContent);
    const markup = svg[key];
    if (!markup) return;
    let icon = button.querySelector<HTMLElement>(".barber-svg-icon");
    const old = button.querySelector<HTMLElement>(":scope > span:not(.barber-svg-icon)");
    old?.remove();
    if (!icon) {
      icon = document.createElement("span");
      icon.className = "barber-svg-icon";
      icon.innerHTML = markup;
      button.insertBefore(icon, button.firstChild);
    }
  });
}

export default function BarberNavIconEnhancer() {
  useEffect(() => {
    let queued = false;
    const scan = () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(() => { queued = false; apply(); });
    };
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    scan();
    return () => observer.disconnect();
  }, []);
  return null;
}
