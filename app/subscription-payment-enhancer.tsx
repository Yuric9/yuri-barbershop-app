"use client";

import { useEffect } from "react";

const OPEN_CLUBE_YURI_KEY = "yuri:open-clube-yuri";
let syncingSubscription = false;

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

async function syncSubscriptionStatus(options?: { reloadWhenChanged?: boolean }) {
  if (syncingSubscription) return false;
  syncingSubscription = true;
  try {
    const response = await fetch("/api/subscriptions/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return false;
    const data = await response.json().catch(() => ({}));
    if (data.changed && options?.reloadWhenChanged !== false) {
      window.sessionStorage.setItem(OPEN_CLUBE_YURI_KEY, "1");
      window.location.reload();
      return true;
    }
    return Boolean(data.changed);
  } catch {
    return false;
  } finally {
    syncingSubscription = false;
  }
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

function addPaymentButton(options: {
  hero: HTMLElement;
  status: HTMLElement;
  className: string;
  label: string;
  note: string;
}) {
  if (options.hero.querySelector(`.${options.className}`)) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = `membership-action ${options.className}`;
  button.textContent = options.label;
  button.addEventListener("click", () => openMercadoPago(button));
  options.status.insertAdjacentElement("afterend", button);

  const note = document.createElement("small");
  note.className = "membership-payment-note";
  note.textContent = options.note;
  button.insertAdjacentElement("afterend", note);
}

function enhanceMembershipPayment() {
  const hero = document.querySelector<HTMLElement>(".membership-hero");
  const status = hero?.querySelector<HTMLElement>(".membership-status");
  if (!hero || !status) return;

  const statusText = status.textContent || "";

  if (/aguardando pagamento/i.test(statusText)) {
    addPaymentButton({
      hero,
      status,
      className: "membership-payment-resume",
      label: "Continuar pagamento no Mercado Pago",
      note: "Pagamento recorrente processado com segurança pelo Mercado Pago.",
    });
    return;
  }

  if (/cancelad[ao]/i.test(statusText)) {
    addPaymentButton({
      hero,
      status,
      className: "membership-payment-restart",
      label: "Assinar Clube Yuri",
      note: "Você pode assinar novamente a qualquer momento. Uma nova assinatura será criada.",
    });
  }
}

export default function SubscriptionPaymentEnhancer() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const asideButton = target?.closest<HTMLButtonElement>("aside button");
      if (asideButton?.textContent?.toLowerCase().includes("clube yuri")) {
        window.setTimeout(() => void syncSubscriptionStatus(), 250);
      }

      const button = target?.closest<HTMLButtonElement>("button.membership-action");
      if (!button) return;
      if (button.classList.contains("membership-payment-resume") || button.classList.contains("membership-payment-restart")) return;
      if (!/quero assinar/i.test(button.textContent || "")) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      void openMercadoPago(button);
    };

    document.addEventListener("click", onClick, true);
    const observer = new MutationObserver(enhanceMembershipPayment);
    observer.observe(document.body, { childList: true, subtree: true });
    enhanceMembershipPayment();

    if (window.sessionStorage.getItem(OPEN_CLUBE_YURI_KEY) === "1") {
      window.sessionStorage.removeItem(OPEN_CLUBE_YURI_KEY);
      window.setTimeout(() => findClubeYuriMenuButton()?.click(), 350);
    }

    const url = new URL(window.location.href);
    if (url.searchParams.get("clube_yuri") === "retorno") {
      url.searchParams.delete("clube_yuri");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      window.sessionStorage.setItem(OPEN_CLUBE_YURI_KEY, "1");
      void syncSubscriptionStatus({ reloadWhenChanged: true }).then((changed) => {
        if (!changed) {
          window.sessionStorage.removeItem(OPEN_CLUBE_YURI_KEY);
          window.setTimeout(() => findClubeYuriMenuButton()?.click(), 200);
        }
      });
    } else {
      void syncSubscriptionStatus();
    }

    return () => {
      document.removeEventListener("click", onClick, true);
      observer.disconnect();
    };
  }, []);

  return null;
}
