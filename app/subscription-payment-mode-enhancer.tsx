"use client";

import { useEffect } from "react";

type PaymentMode = "recurring" | "one_time" | "";
type PaymentState = {
  ok?: boolean;
  subscriptionId?: number;
  status?: string;
  mode?: PaymentMode;
  providerStatus?: string;
};

function membershipState(page: HTMLElement) {
  const status = page.querySelector<HTMLElement>(".membership-status")?.textContent || "";
  if (/assinatura ativa/i.test(status)) return "active" as const;
  if (/aguardando pagamento/i.test(status)) return "pending" as const;
  if (/cancelad[ao]/i.test(status)) return "cancelled" as const;
  if (/bloquead[ao]/i.test(status)) return "blocked" as const;
  return "new" as const;
}

function feedback(page: HTMLElement, text: string) {
  let node = page.querySelector<HTMLElement>(".clube-payment-mode-feedback");
  if (!node) {
    node = document.createElement("p");
    node.className = "clube-payment-mode-feedback";
    page.querySelector(".clube-payment-choice-panel")?.insertAdjacentElement("afterend", node);
  }
  node.textContent = text;
}

async function openCheckout(page: HTMLElement, mode: Exclude<PaymentMode, "">, button: HTMLButtonElement) {
  if (button.dataset.loading === "1") return;
  const original = button.textContent || "Continuar";
  button.dataset.loading = "1";
  button.disabled = true;
  button.textContent = "Preparando Mercado Pago...";
  feedback(page, "");
  try {
    const endpoint = mode === "one_time" ? "/api/subscriptions/checkout-once" : "/api/subscriptions/checkout";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível abrir o pagamento.");
    if (data.testMode) throw new Error("A escolha entre recorrente e 30 dias está disponível no ambiente de produção.");
    if (!data.checkoutUrl) throw new Error("O Mercado Pago não retornou o link de pagamento.");
    window.location.assign(data.checkoutUrl);
  } catch (error) {
    feedback(page, error instanceof Error ? error.message : "Não foi possível abrir o pagamento agora.");
    button.disabled = false;
    button.textContent = original;
    button.dataset.loading = "0";
  }
}

function updateCopy(page: HTMLElement) {
  const hero = page.querySelector<HTMLElement>(".membership-hero");
  if (!hero) return;
  const title = hero.querySelector<HTMLElement>(":scope > h2");
  const intro = hero.querySelector<HTMLElement>(":scope > p");
  const priceSmall = hero.querySelector<HTMLElement>(".membership-price small");
  if (title) title.textContent = "Seu visual em dia por 30 dias.";
  if (intro) intro.textContent = "O mesmo Clube Yuri por R$ 120. Você escolhe se quer renovação automática ou pagar somente um período.";
  if (priceSmall) priceSmall.textContent = ",00 / 30 dias";

  const trust = hero.querySelector<HTMLElement>(".membership-sales-trust");
  if (trust) trust.innerHTML = "<span>🔒 Mercado Pago</span><span>✓ Escolha como pagar</span><span>✓ Plano individual</span>";

  const vipTitle = page.querySelector<HTMLElement>("#clube-vip-title");
  if (vipTitle) vipTitle.textContent = "R$ 120 por 30 dias";
  const vipTopText = page.querySelector<HTMLElement>(".membership-vip-top p");
  if (vipTopText) vipTopText.textContent = "Escolha renovação automática ou pagamento único. O valor e os benefícios permanecem os mesmos.";
  const vipPriceSuffix = page.querySelector<HTMLElement>(".membership-vip-price span");
  if (vipPriceSuffix) vipPriceSuffix.textContent = "/ 30 dias";
}

function hideLegacyPaymentButtons(page: HTMLElement) {
  page.querySelectorAll<HTMLElement>(".membership-hero button.membership-action").forEach((button) => {
    button.style.display = "none";
  });
}

function renderChoicePanel(page: HTMLElement, paymentState: PaymentState | null) {
  const vip = page.querySelector<HTMLElement>(".membership-vip-card");
  if (!vip) return;
  updateCopy(page);
  hideLegacyPaymentButtons(page);

  const state = membershipState(page);
  const renderKey = `${state}:${paymentState?.mode || ""}:${paymentState?.providerStatus || ""}`;
  if (page.dataset.clubePaymentModeRender === renderKey && vip.querySelector(".clube-payment-choice-panel")) return;
  page.dataset.clubePaymentModeRender = renderKey;

  vip.querySelector(".membership-sales-trigger")?.remove();
  vip.querySelector(".clube-payment-choice-panel")?.remove();
  page.querySelector(".clube-payment-mode-feedback")?.remove();

  const panel = document.createElement("div");
  panel.className = "clube-payment-choice-panel";

  if (state === "active") {
    panel.innerHTML = `<div class="clube-payment-current active"><small>CLUBE YURI ATIVO</small><strong>Seu período está liberado</strong><p>Você não precisa iniciar outro pagamento enquanto o Clube estiver ativo.</p></div>`;
  } else if (state === "blocked") {
    panel.innerHTML = `<div class="clube-payment-current"><small>ASSINATURA BLOQUEADA</small><strong>Fale com a Yuri Barbershop</strong><p>Vamos conferir sua assinatura antes de iniciar um novo pagamento.</p><a href="https://wa.me/5562981007636?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20meu%20Clube%20Yuri." target="_blank" rel="noreferrer">Abrir WhatsApp</a></div>`;
  } else if (state === "pending" && !paymentState) {
    panel.innerHTML = `<div class="clube-payment-current"><small>PAGAMENTO EM ANDAMENTO</small><strong>Carregando sua forma de pagamento...</strong></div>`;
  } else if (state === "pending" && paymentState?.mode) {
    const oneTime = paymentState.mode === "one_time";
    panel.innerHTML = `<div class="clube-payment-current pending">
      <small>${oneTime ? "30 DIAS • PAGAMENTO ÚNICO" : "MENSAL • RENOVAÇÃO AUTOMÁTICA"}</small>
      <strong>${oneTime ? "Seu pagamento de 30 dias está em andamento" : "Sua assinatura mensal está em andamento"}</strong>
      <p>${oneTime ? "Continue no Mercado Pago para concluir o pagamento. Não haverá renovação automática." : "Continue no Mercado Pago para concluir a autorização da cobrança recorrente."}</p>
      <button type="button" data-payment-mode="${paymentState.mode}">Continuar no Mercado Pago</button>
    </div>`;
  } else {
    panel.innerHTML = `
      <div class="clube-payment-choice-heading"><small>COMO VOCÊ PREFERE PAGAR?</small><h4>Escolha antes de ir para o Mercado Pago</h4><p>O Clube custa R$ 120 nas duas opções. O que muda é somente a renovação.</p></div>
      <div class="clube-payment-options">
        <article class="clube-payment-option featured">
          <span class="clube-payment-tag">MAIS PRÁTICO</span>
          <small>MENSAL</small>
          <strong>R$ 120 <i>/ mês</i></strong>
          <h5>Renovação automática</h5>
          <p>Autorize uma vez e a cobrança se repete mensalmente no meio aceito pelo Mercado Pago até o cancelamento.</p>
          <button type="button" data-payment-mode="recurring">Assinar mensalmente</button>
        </article>
        <article class="clube-payment-option">
          <span class="clube-payment-tag neutral">SEM RENOVAÇÃO</span>
          <small>30 DIAS</small>
          <strong>R$ 120 <i>/ 30 dias</i></strong>
          <h5>Pagamento único</h5>
          <p>Pague uma vez e o Clube termina ao fim do período. Pix, cartão e outros meios podem aparecer conforme disponibilidade do Mercado Pago.</p>
          <button type="button" data-payment-mode="one_time">Comprar somente 30 dias</button>
        </article>
      </div>
      <p class="clube-payment-method-note">Os meios de pagamento exibidos no checkout são definidos pelo Mercado Pago.</p>
    `;
  }

  const rules = vip.querySelector(".membership-mini-rules");
  if (rules) rules.insertAdjacentElement("beforebegin", panel);
  else vip.appendChild(panel);

  panel.querySelectorAll<HTMLButtonElement>("[data-payment-mode]").forEach((button) => {
    button.addEventListener("click", () => void openCheckout(page, button.dataset.paymentMode as Exclude<PaymentMode, "">, button));
  });

  const sticky = page.querySelector<HTMLElement>(".membership-sales-sticky");
  if (sticky) {
    const stickyPrice = sticky.querySelector<HTMLElement>("strong");
    const stickyButton = sticky.querySelector<HTMLButtonElement>("button");
    if (stickyPrice) stickyPrice.textContent = "R$ 120 / 30 dias";
    if (stickyButton) {
      stickyButton.textContent = state === "pending" && paymentState?.mode ? "CONTINUAR PAGAMENTO" : "ESCOLHER COMO PAGAR";
      const replacement = stickyButton.cloneNode(true) as HTMLButtonElement;
      stickyButton.replaceWith(replacement);
      replacement.addEventListener("click", () => {
        if (state === "pending" && paymentState?.mode) void openCheckout(page, paymentState.mode, replacement);
        else panel.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }
}

export default function SubscriptionPaymentModeEnhancer() {
  useEffect(() => {
    let destroyed = false;
    let paymentState: PaymentState | null = null;
    let loadingState = false;

    async function loadState() {
      if (loadingState) return;
      loadingState = true;
      try {
        const response = await fetch("/api/subscriptions/payment-state", { cache: "no-store" });
        if (response.ok) paymentState = await response.json();
      } catch {
        paymentState = null;
      } finally {
        loadingState = false;
        scan();
      }
    }

    function scan() {
      if (destroyed) return;
      document.querySelectorAll<HTMLElement>(".membership-page.membership-sales-upgraded").forEach((page) => {
        renderChoicePanel(page, paymentState);
      });
    }

    const onCapture = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const legacy = target?.closest<HTMLButtonElement>(".membership-payment-resume, .membership-payment-restart");
      if (!legacy) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const page = legacy.closest<HTMLElement>(".membership-page");
      if (!page) return;
      if (paymentState?.mode) void openCheckout(page, paymentState.mode, legacy);
      else page.querySelector<HTMLElement>(".clube-payment-choice-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    document.addEventListener("click", onCapture, true);
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    scan();
    void loadState();

    return () => {
      destroyed = true;
      observer.disconnect();
      document.removeEventListener("click", onCapture, true);
    };
  }, []);

  return null;
}
