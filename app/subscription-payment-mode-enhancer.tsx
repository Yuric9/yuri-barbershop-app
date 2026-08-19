"use client";

import { useEffect } from "react";

type PaymentMode = "recurring" | "one_time" | "";
type PaymentState = {
  ok?: boolean;
  subscriptionId?: number;
  status?: string;
  mode?: PaymentMode;
  providerStatus?: string;
  expiredAttempt?: boolean;
  pendingExpiresAt?: string;
};

type ReturnOutcome = "aprovado" | "pendente" | "falhou" | "";

function membershipState(page: HTMLElement) {
  const status = page.querySelector<HTMLElement>(".membership-status")?.textContent || "";
  if (/assinatura ativa/i.test(status)) return "active" as const;
  if (/aguardando pagamento/i.test(status)) return "pending" as const;
  if (/cancelad[ao]/i.test(status)) return "cancelled" as const;
  if (/bloquead[ao]/i.test(status)) return "blocked" as const;
  return "new" as const;
}

function legacyStatusExpired(page: HTMLElement) {
  const status = page.querySelector<HTMLElement>(".membership-status")?.textContent || "";
  return /expirad[ao]/i.test(status);
}

function feedback(page: HTMLElement, text: string) {
  let node = page.querySelector<HTMLElement>(".clube-payment-mode-feedback");
  if (!text) {
    node?.remove();
    return;
  }
  if (!node) {
    node = document.createElement("p");
    node.className = "clube-payment-mode-feedback";
    node.setAttribute("role", "status");
    node.setAttribute("aria-live", "polite");
    page.querySelector(".clube-payment-choice-panel")?.insertAdjacentElement("afterend", node);
  }
  node.textContent = text;
}

async function openCheckout(page: HTMLElement, mode: Exclude<PaymentMode, "">, button: HTMLButtonElement) {
  if (button.dataset.loading === "1") return;
  const original = button.textContent || "Continuar";
  button.dataset.loading = "1";
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.textContent = "Preparando Mercado Pago...";
  feedback(page, "Abrindo o ambiente seguro do Mercado Pago...");
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
    button.removeAttribute("aria-busy");
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
  if (title) title.textContent = "Seu visual em dia. Um único valor.";
  if (intro) intro.textContent = "Clube Yuri por R$ 120, com até 6 atendimentos por ciclo. Você escolhe renovação automática mensal ou somente 30 dias.";
  if (priceSmall) priceSmall.textContent = ",00";

  const trust = hero.querySelector<HTMLElement>(".membership-sales-trust");
  if (trust) trust.innerHTML = "<span>🔒 Mercado Pago</span><span>✓ Escolha como pagar</span><span>✓ Plano individual</span>";

  const vipTitle = page.querySelector<HTMLElement>("#clube-vip-title");
  if (vipTitle) vipTitle.textContent = "Clube Yuri por R$ 120";
  const vipTopText = page.querySelector<HTMLElement>(".membership-vip-top p");
  if (vipTopText) vipTopText.textContent = "Mesmo valor e benefícios. Você escolhe se prefere renovação automática mensal ou um único período de 30 dias.";
  const vipPriceSuffix = page.querySelector<HTMLElement>(".membership-vip-price span");
  if (vipPriceSuffix) vipPriceSuffix.textContent = "/ ciclo";
}

function hideLegacyPaymentButtons(page: HTMLElement) {
  page.querySelectorAll<HTMLElement>(".membership-hero button.membership-action").forEach((button) => {
    button.style.display = "none";
  });
}

function updateLegacyStatusVisibility(page: HTMLElement, freshChoice: boolean) {
  const status = page.querySelector<HTMLElement>(".membership-status");
  if (!status) return;
  if (freshChoice || legacyStatusExpired(page)) status.style.display = "none";
  else status.style.removeProperty("display");
}

function showReturnOutcome(page: HTMLElement, outcome: ReturnOutcome) {
  if (!outcome) return;
  const state = membershipState(page);
  if (outcome === "falhou") {
    feedback(page, "O pagamento não foi concluído. Você já pode tentar novamente.");
    return;
  }
  if (outcome === "pendente") {
    feedback(page, "Seu pagamento está em processamento no Mercado Pago. Assim que for confirmado, o Clube será liberado automaticamente.");
    return;
  }
  if (state === "active") {
    feedback(page, "Pagamento confirmado. Seu Clube Yuri está ativo.");
  } else {
    feedback(page, "Pagamento recebido. Estamos confirmando o status com o Mercado Pago; isso pode levar alguns instantes.");
  }
}

function renderChoicePanel(
  page: HTMLElement,
  paymentState: PaymentState | null,
  returnOutcome: ReturnOutcome,
  forceFreshChoice: boolean,
  showExpiredNotice: boolean,
) {
  const vip = page.querySelector<HTMLElement>(".membership-vip-card");
  if (!vip) return;

  const freshChoice = forceFreshChoice || Boolean(paymentState?.expiredAttempt) || legacyStatusExpired(page);
  const state = freshChoice ? "new" : membershipState(page);
  const renderKey = `${state}:${paymentState?.mode || ""}:${paymentState?.providerStatus || ""}:${returnOutcome}:${freshChoice}:${showExpiredNotice}`;
  if (page.dataset.clubePaymentModeRender === renderKey && vip.querySelector(".clube-payment-choice-panel")) {
    hideLegacyPaymentButtons(page);
    updateLegacyStatusVisibility(page, freshChoice);
    return;
  }
  page.dataset.clubePaymentModeRender = renderKey;

  updateCopy(page);
  hideLegacyPaymentButtons(page);
  updateLegacyStatusVisibility(page, freshChoice);
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
      <p>${oneTime ? "Continue no Mercado Pago para concluir o pagamento. Não haverá renovação automática." : "Continue no Mercado Pago para concluir a autorização da cobrança recorrente mensal."}</p>
      <button type="button" data-payment-mode="${paymentState.mode}" aria-label="Continuar pagamento no Mercado Pago">Continuar no Mercado Pago</button>
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
          <p>Autorize uma vez e a cobrança se repete mensalmente pelo Mercado Pago.</p>
          <span class="clube-payment-assurance">Renovação automática mensal • cancelamento pode ser solicitado a qualquer momento.</span>
          <button type="button" data-payment-mode="recurring" aria-label="Assinar Clube Yuri com renovação automática mensal">Assinar mensalmente</button>
        </article>
        <article class="clube-payment-option">
          <span class="clube-payment-tag neutral">SEM RENOVAÇÃO</span>
          <small>30 DIAS</small>
          <strong>R$ 120 <i>/ 30 dias</i></strong>
          <h5>Pagamento único</h5>
          <p>Pague uma vez e use o Clube pelo período contratado. Pix, cartão e outros meios podem aparecer conforme disponibilidade do Mercado Pago.</p>
          <span class="clube-payment-assurance">Pagamento único • não renova automaticamente.</span>
          <button type="button" data-payment-mode="one_time" aria-label="Comprar 30 dias do Clube Yuri sem renovação automática">Comprar somente 30 dias</button>
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
    if (stickyPrice) stickyPrice.textContent = "R$ 120";
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

  if (returnOutcome) showReturnOutcome(page, returnOutcome);
  else if (showExpiredNotice) feedback(page, "A tentativa anterior expirou. Você já pode iniciar um novo pagamento.");
}

export default function SubscriptionPaymentModeEnhancer() {
  useEffect(() => {
    let destroyed = false;
    let paymentState: PaymentState | null = null;
    let loadingState = false;
    let scanScheduled = false;
    let forceFreshChoice = false;
    let showExpiredNotice = false;
    let noticeTimer = 0;
    let pendingExpiryTimer = 0;

    const currentUrl = new URL(window.location.href);
    const rawOutcome = currentUrl.searchParams.get("clube_pagamento") || "";
    let returnOutcome: ReturnOutcome = ["aprovado", "pendente", "falhou"].includes(rawOutcome)
      ? (rawOutcome as ReturnOutcome)
      : "";
    if (rawOutcome) {
      currentUrl.searchParams.delete("clube_pagamento");
      window.history.replaceState({}, "", `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
    }

    function scheduleNoticeRemoval() {
      if (noticeTimer) window.clearTimeout(noticeTimer);
      noticeTimer = window.setTimeout(() => {
        returnOutcome = "";
        showExpiredNotice = false;
        scheduleScan();
      }, 7_000);
    }

    function schedulePendingExpirationCheck() {
      if (pendingExpiryTimer) window.clearTimeout(pendingExpiryTimer);
      pendingExpiryTimer = 0;
      if (paymentState?.status !== "Aguardando pagamento" || !paymentState.pendingExpiresAt) return;
      const expiresAt = new Date(paymentState.pendingExpiresAt).getTime();
      if (!Number.isFinite(expiresAt)) return;
      const delay = Math.max(250, expiresAt - Date.now() + 250);
      pendingExpiryTimer = window.setTimeout(() => void loadState(), Math.min(delay, 2_147_000_000));
    }

    async function loadState() {
      if (loadingState) return;
      loadingState = true;
      try {
        const response = await fetch("/api/subscriptions/payment-state", { cache: "no-store" });
        if (response.ok) {
          paymentState = await response.json();
          if (paymentState?.expiredAttempt) {
            forceFreshChoice = true;
            showExpiredNotice = true;
            scheduleNoticeRemoval();
          }
          schedulePendingExpirationCheck();
        }
      } catch {
        paymentState = null;
      } finally {
        loadingState = false;
        scheduleScan();
      }
    }

    async function expireFailedAttempt() {
      try {
        const response = await fetch("/api/subscriptions/expire-pending", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.expired) forceFreshChoice = true;
      } catch {}
      scheduleNoticeRemoval();
      await loadState();
    }

    function scan() {
      scanScheduled = false;
      if (destroyed) return;
      document.querySelectorAll<HTMLElement>(".membership-page.membership-sales-upgraded").forEach((page) => {
        renderChoicePanel(page, paymentState, returnOutcome, forceFreshChoice, showExpiredNotice);
      });
    }

    function scheduleScan() {
      if (destroyed || scanScheduled) return;
      scanScheduled = true;
      window.requestAnimationFrame(scan);
    }

    function focusPaymentChoice(page: HTMLElement) {
      scheduleScan();
      window.setTimeout(() => {
        const panel = page.querySelector<HTMLElement>(".clube-payment-choice-panel");
        if (!panel) return;
        panel.scrollIntoView({ behavior: "smooth", block: "center" });
        panel.querySelector<HTMLButtonElement>("button[data-payment-mode]")?.focus({ preventScroll: true });
      }, 80);
    }

    const onCapture = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const legacy = target?.closest<HTMLButtonElement>("button.membership-action");
      if (!legacy) return;
      const page = legacy.closest<HTMLElement>(".membership-page");
      if (!page) return;

      // Bloqueia o fluxo antigo de "Quero assinar" para que nenhum clique rápido
      // pule a escolha entre mensal recorrente e pagamento único de 30 dias.
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (membershipState(page) === "active") return;
      const freshChoice = forceFreshChoice || Boolean(paymentState?.expiredAttempt) || legacyStatusExpired(page);
      if (!freshChoice && paymentState?.mode && /continuar/i.test(legacy.textContent || "")) {
        void openCheckout(page, paymentState.mode, legacy);
        return;
      }
      focusPaymentChoice(page);
    };

    document.addEventListener("click", onCapture, true);
    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.body, { childList: true, subtree: true });
    scheduleScan();
    if (returnOutcome === "falhou") void expireFailedAttempt();
    else void loadState();

    return () => {
      destroyed = true;
      observer.disconnect();
      document.removeEventListener("click", onCapture, true);
      if (noticeTimer) window.clearTimeout(noticeTimer);
      if (pendingExpiryTimer) window.clearTimeout(pendingExpiryTimer);
    };
  }, []);

  return null;
}
