"use client";

import { useEffect } from "react";

function findClubeYuriMenuButton() {
  return [...document.querySelectorAll<HTMLButtonElement>("aside button")].find((button) =>
    button.textContent?.toLowerCase().includes("clube yuri"),
  );
}

function showMembershipMessage(text: string) {
  const hero = document.querySelector<HTMLElement>(".membership-hero");
  if (!hero) return;
  let message = hero.querySelector<HTMLElement>(".membership-payment-feedback");
  if (!message) {
    message = document.createElement("p");
    message.className = "membership-message membership-payment-feedback";
    hero.appendChild(message);
  }
  message.textContent = text;
}

async function openMercadoPago(button: HTMLButtonElement) {
  if (button.dataset.paymentLoading === "1") return;
  button.dataset.paymentLoading = "1";
  const previous = button.textContent || "Pagar com Mercado Pago";
  button.disabled = true;
  button.textContent = "Abrindo pagamento seguro...";
  try {
    const response = await fetch("/api/subscriptions/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.checkoutUrl) throw new Error(data.error || "Não foi possível abrir o pagamento.");
    window.location.assign(data.checkoutUrl);
  } catch (error) {
    showMembershipMessage(error instanceof Error ? error.message : "Não foi possível abrir o pagamento agora.");
    button.disabled = false;
    button.textContent = previous;
    button.dataset.paymentLoading = "0";
  }
}

function enhancePendingMembership() {
  const hero = document.querySelector<HTMLElement>(".membership-hero");
  const status = hero?.querySelector<HTMLElement>(".membership-status");
  if (!hero || !status || !/aguardando pagamento/i.test(status.textContent || "")) return;
  if (hero.querySelector(".membership-payment-resume")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "membership-action membership-payment-resume";
  button.textContent = "Continuar pagamento no Mercado Pago";
  button.addEventListener("click", () => openMercadoPago(button));
  status.insertAdjacentElement("afterend", button);

  const note = document.createElement("small");
  note.className = "membership-payment-note";
  note.textContent = "Pagamento recorrente processado com segurança pelo Mercado Pago.";
  button.insertAdjacentElement("afterend", note);
}

export default function SubscriptionPaymentEnhancer() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>("button.membership-action");
      if (!button || button.classList.contains("membership-payment-resume")) return;
      if (!/quero assinar/i.test(button.textContent || "")) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      void openMercadoPago(button);
    };

    document.addEventListener("click", onClick, true);
    const observer = new MutationObserver(enhancePendingMembership);
    observer.observe(document.body, { childList: true, subtree: true });
    enhancePendingMembership();

    const url = new URL(window.location.href);
    if (url.searchParams.get("clube_yuri") === "retorno") {
      window.setTimeout(() => {
        findClubeYuriMenuButton()?.click();
        url.searchParams.delete("clube_yuri");
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      }, 350);
    }

    return () => {
      document.removeEventListener("click", onClick, true);
      observer.disconnect();
    };
  }, []);

  return null;
}
