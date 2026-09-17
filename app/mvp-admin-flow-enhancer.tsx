"use client";

import { useEffect } from "react";

function patchAdminControls() {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));

  for (const button of buttons) {
    const text = button.textContent?.trim() || "";

    if (text === "+ Novo agendamento" && !button.dataset.mvpPatched) {
      button.dataset.mvpPatched = "true";
      button.textContent = "+ Nova movimentação";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const caixa = buttons.find((item) => item.textContent?.trim() === "Caixa");
        if (caixa) caixa.click();
      }, true);
    }

    if (text === "★ Finalizar atendimento") {
      const row = button.closest(".agenda-admin-row");
      const status = row?.querySelector(".appointment .status, .appointment .pending")?.textContent?.trim();
      const canFinalize = status === "Confirmado";
      button.disabled = !canFinalize;
      if (!canFinalize) button.title = "Confirme o agendamento antes de finalizar o atendimento.";
    }
  }
}

export default function MvpAdminFlowEnhancer() {
  useEffect(() => {
    patchAdminControls();
    const observer = new MutationObserver(patchAdminControls);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
