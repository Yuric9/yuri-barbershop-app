"use client";

import { useEffect } from "react";

type ModeMap = Record<string, "recurring" | "one_time">;

function modeLabel(mode?: string) {
  if (mode === "one_time") return "30 dias • pagamento único";
  if (mode === "recurring") return "Mensal • renovação automática";
  return "Forma não identificada";
}

export default function SubscriptionAdminPaymentModeEnhancer() {
  useEffect(() => {
    let destroyed = false;
    let modes: ModeMap = {};

    async function loadModes() {
      try {
        const response = await fetch("/api/admin/subscriptions/payment-modes", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        modes = data.modes || {};
        decorate();
      } catch {}
    }

    function decorate() {
      if (destroyed) return;
      const root = document.getElementById("clube-admin-pro");
      if (!root) return;

      root.querySelectorAll<HTMLElement>(".clube-admin-member[data-open-member]").forEach((card) => {
        const id = String(card.dataset.openMember || "");
        const mode = modes[id];
        const signature = mode || "unknown";
        if (card.dataset.paymentModeDecorated === signature) return;
        card.dataset.paymentModeDecorated = signature;
        card.querySelector(".clube-admin-payment-mode")?.remove();
        const meta = card.querySelector<HTMLElement>(".clube-admin-member-meta");
        if (!meta) return;
        const item = document.createElement("span");
        item.className = `clube-admin-payment-mode ${mode || "unknown"}`;
        item.innerHTML = `<small>FORMA</small><b>${modeLabel(mode)}</b>`;
        meta.appendChild(item);
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
      }
    }

    const observer = new MutationObserver(decorate);
    observer.observe(document.body, { childList: true, subtree: true });
    decorate();
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
