"use client";

import { useEffect } from "react";

type ModeMap = Record<string, "recurring" | "one_time">;

function modeLabel(mode?: string) {
  if (mode === "one_time") return "30 dias • pagamento único";
  if (mode === "recurring") return "Mensal • renovação automática";
  return "Forma não identificada";
}

function setSmallLabel(container: Element | null, text: string) {
  const label = container?.querySelector<HTMLElement>("small");
  if (label) label.textContent = text;
}

export default function SubscriptionAdminPaymentModeEnhancer() {
  useEffect(() => {
    let destroyed = false;
    let modes: ModeMap = {};
    let decorateScheduled = false;

    async function loadModes() {
      try {
        const response = await fetch("/api/admin/subscriptions/payment-modes", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        modes = data.modes || {};
        scheduleDecorate();
      } catch {}
    }

    function decorate() {
      decorateScheduled = false;
      if (destroyed) return;
      const root = document.getElementById("clube-admin-pro");
      if (!root) return;

      // Como agora existem assinaturas recorrentes e períodos únicos de 30 dias,
      // o indicador geral precisa falar de ciclos, não apenas de renovações.
      root.querySelectorAll<HTMLElement>(".clube-admin-metric").forEach((metric) => {
        const label = metric.querySelector<HTMLElement>("small");
        if (label?.textContent?.includes("RENOVAM EM 7 DIAS")) {
          label.textContent = "CICLOS EM 7 DIAS";
          const hint = metric.querySelector<HTMLElement>("span");
          if (hint) hint.textContent = "renovações e vencimentos";
        }
      });

      const renewalsHeading = root.querySelector<HTMLElement>(".clube-admin-renewals .clube-admin-subheading h3");
      if (renewalsHeading) renewalsHeading.textContent = "Renovações e vencimentos";
      const renewalsDescription = root.querySelector<HTMLElement>(".clube-admin-renewals .clube-admin-subheading p");
      if (renewalsDescription) renewalsDescription.textContent = "Acompanhe cobranças recorrentes e o fim dos períodos de 30 dias em um único lugar.";

      root.querySelectorAll<HTMLElement>(".clube-admin-member[data-open-member]").forEach((card) => {
        const id = String(card.dataset.openMember || "");
        const mode = modes[id];
        const meta = card.querySelector<HTMLElement>(".clube-admin-member-meta");
        if (meta) {
          const firstMeta = meta.querySelector(":scope > span");
          setSmallLabel(firstMeta, mode === "one_time" ? "Fim do período" : "Próxima renovação");
        }

        const signature = mode || "unknown";
        if (card.dataset.paymentModeDecorated === signature) return;
        card.dataset.paymentModeDecorated = signature;
        card.querySelector(".clube-admin-payment-mode")?.remove();
        if (!meta) return;
        const item = document.createElement("span");
        item.className = `clube-admin-payment-mode ${mode || "unknown"}`;
        item.innerHTML = `<small>FORMA</small><b>${modeLabel(mode)}</b>`;
        meta.appendChild(item);
      });

      root.querySelectorAll<HTMLElement>(".clube-admin-renewal-list > button[data-open-member]").forEach((row) => {
        const id = String(row.dataset.openMember || "");
        const mode = modes[id];
        const info = row.querySelectorAll<HTMLElement>(":scope > span");
        if (info[0]) setSmallLabel(info[0], mode === "one_time" ? "Fim do período" : "Próxima renovação");
      });

      const drawer = root.querySelector<HTMLElement>(".clube-admin-drawer");
      if (drawer) {
        const id = String(drawer.querySelector<HTMLElement>("[data-sync-member]")?.dataset.syncMember || "");
        const mode = modes[id];
        const statusRow = drawer.querySelector<HTMLElement>(".clube-admin-drawer-status");
        if (statusRow) {
          let badge = statusRow.querySelector<HTMLElement>(".clube-admin-payment-mode-badge");
          if (!badge) {
            badge = document.createElement("span");
            badge.className = "clube-admin-payment-mode-badge";
            statusRow.appendChild(badge);
          }
          badge.textContent = modeLabel(mode);
        }

        const detailCells = drawer.querySelectorAll<HTMLElement>(".clube-admin-detail-grid > span");
        if (detailCells[2]) setSmallLabel(detailCells[2], mode === "one_time" ? "Fim do período" : "Próxima renovação");
      }
    }

    function scheduleDecorate() {
      if (destroyed || decorateScheduled) return;
      decorateScheduled = true;
      window.requestAnimationFrame(decorate);
    }

    const observer = new MutationObserver(scheduleDecorate);
    observer.observe(document.body, { childList: true, subtree: true });
    scheduleDecorate();
    void loadModes();
    const refreshTimer = window.setInterval(loadModes, 30000);

    return () => {
      destroyed = true;
      observer.disconnect();
      window.clearInterval(refreshTimer);
    };
  }, []);

  return null;
}
