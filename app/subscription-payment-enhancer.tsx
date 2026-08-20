"use client";

import { useEffect } from "react";

type MercadoPagoCardForm = { getCardFormData: () => { token?: unknown } };
type MercadoPagoSdk = { cardForm: (options: Record<string, unknown>) => MercadoPagoCardForm };
type MercadoPagoWindow = Window & { MercadoPago?: new (publicKey: string) => MercadoPagoSdk };

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
    message.setAttribute("role", "status");
    message.setAttribute("aria-live", "polite");
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

function loadMercadoPagoSdk() {
  return new Promise<void>((resolve, reject) => {
    if ((window as MercadoPagoWindow).MercadoPago) return resolve();
    const existing = document.querySelector<HTMLScriptElement>('script[data-yuri-mp-sdk="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar Mercado Pago.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.dataset.yuriMpSdk = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar Mercado Pago."));
    document.head.appendChild(script);
  });
}

function selectCpfWhenReady() {
  const select = document.getElementById("yuri-mp-identificationType") as HTMLSelectElement | null;
  if (!select) return;
  const cpf = [...select.options].find((option) => option.value === "CPF");
  if (cpf) select.value = "CPF";
  else window.setTimeout(selectCpfWhenReady, 150);
}

async function openTestCardForm(options: {
  publicKey: string;
  amount: number;
  payerEmail: string;
  button: HTMLButtonElement;
  previousLabel: string;
}) {
  await loadMercadoPagoSdk();
  document.getElementById("yuri-mp-test-overlay")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "yuri-mp-test-overlay";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:99999;display:flex;align-items:center;justify-content:center;padding:18px;overflow:auto";
  overlay.innerHTML = `
    <div style="width:min(520px,100%);background:#fff;color:#171714;border-radius:18px;padding:22px;box-shadow:0 24px 80px rgba(0,0,0,.35)">
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:start;margin-bottom:14px">
        <div><div style="font-size:12px;font-weight:800;letter-spacing:.12em;color:#a87308">CLUBE YURI • TESTE SEGURO</div><h2 style="margin:5px 0 4px;font-size:25px">Autorizar assinatura</h2><p style="margin:0;color:#666;font-size:13px">Os dados sensíveis do cartão são enviados diretamente ao Mercado Pago.</p></div>
        <button id="yuri-mp-close" type="button" style="border:0;background:#eee;border-radius:999px;width:34px;height:34px;font-size:20px;cursor:pointer">×</button>
      </div>
      <div style="background:#fff8e8;border:1px solid #f2d693;border-radius:10px;padding:10px 12px;margin-bottom:14px;font-size:12px"><strong>Ambiente de teste.</strong> Use somente um cartão oficial de teste do Mercado Pago. Não use cartão real.</div>
      <form id="yuri-mp-form" style="display:grid;gap:11px">
        <label style="font-size:12px;font-weight:700">Número do cartão<div id="yuri-mp-cardNumber" style="height:42px;border:1px solid #cfcfcf;border-radius:9px;padding:10px;margin-top:5px"></div></label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <label style="font-size:12px;font-weight:700">Validade<div id="yuri-mp-expirationDate" style="height:42px;border:1px solid #cfcfcf;border-radius:9px;padding:10px;margin-top:5px"></div></label>
          <label style="font-size:12px;font-weight:700">CVV<div id="yuri-mp-securityCode" style="height:42px;border:1px solid #cfcfcf;border-radius:9px;padding:10px;margin-top:5px"></div></label>
        </div>
        <label style="font-size:12px;font-weight:700">Nome do titular<input id="yuri-mp-cardholderName" value="APRO" style="box-sizing:border-box;width:100%;height:42px;border:1px solid #cfcfcf;border-radius:9px;padding:0 11px;margin-top:5px" /></label>
        <label style="font-size:12px;font-weight:700">CPF<input id="yuri-mp-identificationNumber" value="12345678909" style="box-sizing:border-box;width:100%;height:42px;border:1px solid #cfcfcf;border-radius:9px;padding:0 11px;margin-top:5px" /></label>
        <input id="yuri-mp-cardholderEmail" type="email" value="${options.payerEmail}" readonly style="display:none" />
        <select id="yuri-mp-issuer" style="display:none"></select>
        <select id="yuri-mp-installments" style="display:none"></select>
        <select id="yuri-mp-identificationType" style="display:none"></select>
        <button id="yuri-mp-submit" type="submit" style="height:46px;border:0;border-radius:10px;background:#c89427;color:#15130f;font-weight:800;font-size:15px;cursor:pointer">Autorizar R$ ${Number(options.amount).toFixed(2).replace(".", ",")}</button>
        <progress id="yuri-mp-progress" value="0" style="width:100%;display:none"></progress>
        <div id="yuri-mp-error" style="color:#b42318;font-size:12px;min-height:16px"></div>
      </form>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
    options.button.disabled = false;
    options.button.textContent = options.previousLabel;
    options.button.dataset.paymentLoading = "0";
  };
  document.getElementById("yuri-mp-close")?.addEventListener("click", close);

  const MercadoPago = (window as MercadoPagoWindow).MercadoPago;
  if (!MercadoPago) throw new Error("Mercado Pago indisponível.");
  const mp = new MercadoPago(options.publicKey);
  const cardForm = mp.cardForm({
    amount: String(options.amount),
    iframe: true,
    form: {
      id: "yuri-mp-form",
      cardNumber: { id: "yuri-mp-cardNumber", placeholder: "Número do cartão" },
      expirationDate: { id: "yuri-mp-expirationDate", placeholder: "MM/AA" },
      securityCode: { id: "yuri-mp-securityCode", placeholder: "CVV" },
      cardholderName: { id: "yuri-mp-cardholderName", placeholder: "Titular" },
      issuer: { id: "yuri-mp-issuer", placeholder: "Emissor" },
      installments: { id: "yuri-mp-installments", placeholder: "Parcelas" },
      identificationType: { id: "yuri-mp-identificationType", placeholder: "Documento" },
      identificationNumber: { id: "yuri-mp-identificationNumber", placeholder: "CPF" },
      cardholderEmail: { id: "yuri-mp-cardholderEmail", placeholder: "E-mail" },
    },
    callbacks: {
      onFormMounted: (error: unknown) => {
        if (error) showMembershipMessage("Não foi possível iniciar o formulário seguro do Mercado Pago.");
        selectCpfWhenReady();
      },
      onSubmit: async (event: Event) => {
        event.preventDefault();
        const errorBox = document.getElementById("yuri-mp-error");
        const submit = document.getElementById("yuri-mp-submit") as HTMLButtonElement | null;
        if (submit) { submit.disabled = true; submit.textContent = "Autorizando..."; }
        if (errorBox) errorBox.textContent = "";
        try {
          const token = String(cardForm.getCardFormData()?.token || "");
          if (!token) throw new Error("Confira os dados do cartão de teste.");
          const response = await fetch("/api/subscriptions/checkout", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ cardTokenId: token }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.authorized) throw new Error(data.error || `Mercado Pago retornou status ${data.providerStatus || "não autorizado"}.`);
          overlay.remove();
          showMembershipMessage("Pagamento de teste autorizado. Clube Yuri ativado.");
          window.sessionStorage.setItem(OPEN_CLUBE_YURI_KEY, "1");
          window.setTimeout(() => window.location.reload(), 500);
        } catch (error) {
          if (errorBox) errorBox.textContent = error instanceof Error ? error.message : "Não foi possível autorizar o teste.";
          if (submit) { submit.disabled = false; submit.textContent = `Autorizar R$ ${Number(options.amount).toFixed(2).replace(".", ",")}`; }
        }
      },
      onFetching: () => {
        const progress = document.getElementById("yuri-mp-progress") as HTMLProgressElement | null;
        if (progress) progress.style.display = "block";
        return () => { if (progress) progress.style.display = "none"; };
      },
    },
  });
}

async function openMercadoPago(button: HTMLButtonElement) {
  if (button.dataset.paymentLoading === "1") return;
  button.dataset.paymentLoading = "1";
  const previous = button.textContent || "Pagar com Mercado Pago";
  button.disabled = true;
  button.textContent = "Preparando pagamento seguro...";
  try {
    const response = await fetch("/api/subscriptions/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível abrir o pagamento.");
    if (data.testMode && data.publicKey) {
      await openTestCardForm({ publicKey: data.publicKey, amount: Number(data.amount || 120), payerEmail: data.payerEmail || "test@testuser.com", button, previousLabel: previous });
      return;
    }
    if (!data.checkoutUrl) throw new Error("Não foi possível abrir o pagamento.");
    window.location.assign(data.checkoutUrl);
  } catch (error) {
    showMembershipMessage(error instanceof Error ? error.message : "Não foi possível abrir o pagamento agora.");
    button.disabled = false;
    button.textContent = previous;
    button.dataset.paymentLoading = "0";
  }
}

function addPaymentButton(options: { hero: HTMLElement; status: HTMLElement; className: string; label: string; note: string }) {
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
    addPaymentButton({ hero, status, className: "membership-payment-resume", label: "Continuar pagamento no Mercado Pago", note: "Pagamento processado com segurança pelo Mercado Pago." });
    return;
  }
  if (/cancelad[ao]/i.test(statusText)) {
    addPaymentButton({ hero, status, className: "membership-payment-restart", label: "Assinar Clube Yuri", note: "Você pode entrar novamente no Clube a qualquer momento." });
  }
}

export default function SubscriptionPaymentEnhancer() {
  useEffect(() => {
    let scanScheduled = false;

    function scheduleEnhance() {
      if (scanScheduled) return;
      scanScheduled = true;
      window.requestAnimationFrame(() => {
        scanScheduled = false;
        enhanceMembershipPayment();
      });
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const asideButton = target?.closest<HTMLButtonElement>("aside button");
      if (asideButton?.textContent?.toLowerCase().includes("clube yuri")) window.setTimeout(() => void syncSubscriptionStatus(), 250);
      const button = target?.closest<HTMLButtonElement>("button.membership-action");
      if (!button) return;
      if (button.classList.contains("membership-payment-resume") || button.classList.contains("membership-payment-restart")) return;
      if (!/quero assinar/i.test(button.textContent || "")) return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      void openMercadoPago(button);
    };

    document.addEventListener("click", onClick, true);
    const observer = new MutationObserver(scheduleEnhance);
    observer.observe(document.body, { childList: true, subtree: true });
    scheduleEnhance();

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
    }

    return () => {
      document.removeEventListener("click", onClick, true);
      observer.disconnect();
    };
  }, []);
  return null;
}
