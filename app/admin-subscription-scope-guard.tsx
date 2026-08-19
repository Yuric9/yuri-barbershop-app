"use client";

import { useEffect } from "react";

function normalize(value: string | null | undefined) {
  return String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
}

function subscriptionsSectionIsActive() {
  const active = document.querySelector<HTMLButtonElement>(".sidebar nav button.active");
  return normalize(active?.textContent) === "assinaturas";
}

export default function AdminSubscriptionScopeGuard() {
  useEffect(() => {
    let destroyed = false;
    let scheduled = false;

    function sync() {
      scheduled = false;
      if (destroyed) return;

      const root = document.getElementById("clube-admin-pro") as HTMLElement | null;
      if (!root) return;

      const active = subscriptionsSectionIsActive();
      root.style.display = active ? "" : "none";
      root.setAttribute("aria-hidden", active ? "false" : "true");

      // Segurança extra para qualquer extensão visual da área de Arquivados.
      document.querySelectorAll<HTMLElement>(".clube-admin-archive-view").forEach((view) => {
        view.style.display = active ? "" : "none";
      });
    }

    function scheduleSync() {
      if (destroyed || scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(sync);
    }

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    document.addEventListener("click", scheduleSync, true);
    scheduleSync();

    return () => {
      destroyed = true;
      observer.disconnect();
      document.removeEventListener("click", scheduleSync, true);
      document.getElementById("clube-admin-pro")?.style.removeProperty("display");
    };
  }, []);

  return null;
}
