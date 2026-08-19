"use client";

import { useEffect } from "react";

const PLAN_PRICE = 120;
const DEFAULT_ROUTINE = "combo";
const DEFAULT_VISITS = 4;

const ROUTINES = {
  corte: { label: "Só corte", short: "Corte", price: 30 },
  combo: { label: "Corte + barba", short: "Corte + barba", price: 60 },
  completo: { label: "Corte + barba + sobrancelhas", short: "Completo", price: 75 },
} as const;

type RoutineKey = keyof typeof ROUTINES;

function money(value: number) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

function membershipState(page: HTMLElement) {
  const status = page.querySelector<HTMLElement>(".membership-status")?.textContent || "";
  if (/assinatura ativa/i.test(status)) return "active" as const;
  if (/aguardando pagamento/i.test(status)) return "pending" as const;
  if (/cancelad[ao]/i.test(status)) return "cancelled" as const;
  if (/bloquead[ao]/i.test(status)) return "blocked" as const;
  return "new" as const;
}

function primaryLabel(state: ReturnType<typeof membershipState>) {
  if (state === "active") return "ASSINATURA ATIVA";
  if (state === "pending") return "CONTINUAR NO MERCADO PAGO";
  if (state === "cancelled") return "ASSINAR NOVAMENTE";
  if (state === "blocked") return "FALAR COM A BARBEARIA";
  return "QUERO ENTRAR PARA O CLUBE";
}

function findPaymentButton(page: HTMLElement) {
  const hero = page.querySelector<HTMLElement>(".membership-hero");
  if (!hero) return null;
  return (
    hero.querySelector<HTMLButtonElement>(".membership-payment-resume") ||
    hero.querySelector<HTMLButtonElement>(".membership-payment-restart") ||
    hero.querySelector<HTMLButtonElement>("button.membership-action")
  );
}

function triggerPrimaryAction(page: HTMLElement, source: HTMLButtonElement, attempt = 0) {
  const state = membershipState(page);
  if (state === "active") return;
  if (state === "blocked") {
    window.open(
      "https://wa.me/5562981007636?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20minha%20assinatura%20do%20Clube%20Yuri.",
      "_blank",
      "noopener,noreferrer",
    );
    return;
  }

  const target = findPaymentButton(page);
  if (target) {
    target.click();
    return;
  }

  if (attempt < 12) {
    source.disabled = true;
    source.textContent = "PREPARANDO PAGAMENTO...";
    window.setTimeout(() => {
      source.disabled = false;
      source.textContent = primaryLabel(membershipState(page));
      triggerPrimaryAction(page, source, attempt + 1);
    }, 100);
  }
}

function updateCalculator(page: HTMLElement, routineKey: RoutineKey, visits: number) {
  const routine = ROUTINES[routineKey];
  const monthlySpend = routine.price * visits;
  const difference = monthlySpend - PLAN_PRICE;
  const discount = difference > 0 ? Math.round((difference / monthlySpend) * 100) : 0;

  page.querySelectorAll<HTMLButtonElement>("[data-clube-routine]").forEach((button) => {
    const selected = button.dataset.clubeRoutine === routineKey;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  });
  page.querySelectorAll<HTMLButtonElement>("[data-clube-visits]").forEach((button) => {
    const selected = Number(button.dataset.clubeVisits) === visits;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  });

  const spend = page.querySelector<HTMLElement>("[data-clube-spend]");
  const plan = page.querySelector<HTMLElement>("[data-clube-plan]");
  const result = page.querySelector<HTMLElement>("[data-clube-result]");
  const resultLabel = page.querySelector<HTMLElement>("[data-clube-result-label]");
  const summary = page.querySelector<HTMLElement>("[data-clube-summary]");

  if (spend) spend.textContent = money(monthlySpend);
  if (plan) plan.textContent = money(PLAN_PRICE);

  if (difference > 0) {
    if (resultLabel) resultLabel.textContent = "VOCÊ ECONOMIZA";
    if (result) result.textContent = `${money(difference)}/mês`;
    if (summary) summary.textContent = `${routine.short} ${visits}x no mês sairia por ${money(monthlySpend)} no avulso. No Clube Yuri, continua R$ 120${discount ? ` — cerca de ${discount}% a menos.` : "."}`;
  } else if (difference === 0) {
    if (resultLabel) resultLabel.textContent = "O PLANO JÁ SE PAGA";
    if (result) result.textContent = "R$ 120 = R$ 120";
    if (summary) summary.textContent = `Sua rotina de ${routine.short.toLowerCase()} ${visits}x no mês já chega a R$ 120. No Clube, você mantém o mesmo valor mensal e ganha mais liberdade para cuidar do visual.`;
  } else {
    if (resultLabel) resultLabel.textContent = "SEU GASTO HOJE";
    if (result) result.textContent = money(monthlySpend);
    if (summary) summary.textContent = `Hoje essa rotina custa ${money(monthlySpend)}. O Clube faz mais sentido quando você quer vir mais vezes no mês e manter cabelo, barba e sobrancelhas em dia por um valor fixo.`;
  }
}

function enhanceMembershipPage(page: HTMLElement) {
  if (page.dataset.clubeSalesUpgraded === "2") return;
  page.dataset.clubeSalesUpgraded = "2";
  page.classList.add("membership-sales-upgraded");

  const hero = page.querySelector<HTMLElement>(".membership-hero");
  if (!hero) return;

  const eyebrow = hero.querySelector<HTMLElement>(":scope > span");
  const title = hero.querySelector<HTMLElement>(":scope > h2");
  const intro = hero.querySelector<HTMLElement>(":scope > p");
  const priceStrong = hero.querySelector<HTMLElement>(".membership-price strong");
  const priceSmall = hero.querySelector<HTMLElement>(".membership-price small");
  const originalAction = hero.querySelector<HTMLButtonElement>("button.membership-action");

  if (eyebrow) eyebrow.textContent = "♛ CLUBE YURI";
  if (title) title.textContent = "Seu visual em dia. Um valor fixo por mês.";
  if (intro) intro.textContent = "Corte, barba e sobrancelhas durante o mês, com até 6 atendimentos e pagamento recorrente seguro.";
  if (priceStrong) priceStrong.textContent = "R$ 120";
  if (priceSmall) priceSmall.textContent = ",00 / mês";
  if (originalAction && !originalAction.classList.contains("membership-payment-resume") && !originalAction.classList.contains("membership-payment-restart")) {
    originalAction.textContent = "Quero entrar para o Clube";
  }

  if (!hero.querySelector(".membership-sales-limit")) {
    const heroLimit = document.createElement("div");
    heroLimit.className = "membership-sales-limit";
    heroLimit.innerHTML = "<strong>ATÉ 6 ATENDIMENTOS</strong><span>em cada período de 30 dias</span>";
    hero.querySelector(".membership-price")?.insertAdjacentElement("afterend", heroLimit);
  }

  if (!hero.querySelector(".membership-sales-trust")) {
    const trust = document.createElement("div");
    trust.className = "membership-sales-trust";
    trust.innerHTML = "<span>🔒 Mercado Pago</span><span>↻ Mensal</span><span>✓ Plano individual</span>";
    hero.appendChild(trust);
  }

  page.querySelector(".membership-sales-content")?.remove();
  page.querySelector(".membership-sales-sticky")?.remove();

  const state = membershipState(page);
  const content = document.createElement("div");
  content.className = "membership-sales-content";
  content.innerHTML = `
    <section class="membership-smart-calculator" aria-labelledby="clube-calculadora-title">
      <div class="membership-sales-heading">
        <small>FAÇA A CONTA DO SEU JEITO</small>
        <h3 id="clube-calculadora-title">Quanto você costuma gastar por mês?</h3>
        <p>Escolha sua rotina e veja na hora se o Clube Yuri compensa para você.</p>
      </div>

      <div class="membership-choice-block">
        <span>1. O que você costuma fazer?</span>
        <div class="membership-routine-picker" role="group" aria-label="Serviços que costuma fazer">
          ${Object.entries(ROUTINES).map(([key, item]) => `<button type="button" data-clube-routine="${key}" aria-pressed="false"><b>${item.label}</b><small>${money(item.price)} por visita</small></button>`).join("")}
        </div>
      </div>

      <div class="membership-choice-block">
        <span>2. Quantas vezes por mês?</span>
        <div class="membership-visit-picker" role="group" aria-label="Quantidade de visitas no mês">
          ${[1, 2, 3, 4, 5, 6].map((visit) => `<button type="button" data-clube-visits="${visit}" aria-pressed="false">${visit}x</button>`).join("")}
        </div>
      </div>

      <div class="membership-calculator-result">
        <div class="membership-spend-compare">
          <div><small>SEU GASTO NO AVULSO</small><strong data-clube-spend>R$ 240,00</strong></div>
          <span>→</span>
          <div class="club"><small>CLUBE YURI</small><strong data-clube-plan>R$ 120,00</strong></div>
        </div>
        <div class="membership-saving-highlight">
          <small data-clube-result-label>VOCÊ ECONOMIZA</small>
          <strong data-clube-result>R$ 120,00/mês</strong>
          <p data-clube-summary></p>
        </div>
      </div>
    </section>

    <section class="membership-vip-card" aria-labelledby="clube-vip-title">
      <div class="membership-vip-badge">CLUBE YURI • VIP</div>
      <div class="membership-vip-top">
        <div>
          <small>UM ÚNICO PLANO</small>
          <h3 id="clube-vip-title">R$ 120 por mês</h3>
          <p>Cabelo, barba e sobrancelhas em dia, sem ficar calculando cada visita.</p>
        </div>
        <div class="membership-vip-price"><strong>R$ 120</strong><span>/ mês</span></div>
      </div>
      <div class="membership-vip-benefits compact">
        <span>✓ Até 6 atendimentos em 30 dias</span>
        <span>✓ Agendamento online</span>
        <span>✓ Plano pessoal e intransferível</span>
        <span>✓ Pagamento seguro pelo Mercado Pago</span>
      </div>
      <button type="button" class="membership-sales-trigger" ${state === "active" ? "disabled" : ""}>${primaryLabel(state)}</button>
      <details class="membership-mini-rules">
        <summary>Ver regras do Clube</summary>
        <p>Atendimentos mediante agendamento e disponibilidade. O limite vale para cada período ativo de 30 dias e não acumula para o mês seguinte. Produtos não estão incluídos.</p>
      </details>
    </section>
  `;

  const oldBenefits = page.querySelector<HTMLElement>(".membership-benefits");
  if (oldBenefits) oldBenefits.insertAdjacentElement("beforebegin", content);
  else page.appendChild(content);

  let selectedRoutine: RoutineKey = DEFAULT_ROUTINE;
  let selectedVisits = DEFAULT_VISITS;

  page.querySelectorAll<HTMLButtonElement>("[data-clube-routine]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = String(button.dataset.clubeRoutine || DEFAULT_ROUTINE) as RoutineKey;
      if (!(next in ROUTINES)) return;
      selectedRoutine = next;
      updateCalculator(page, selectedRoutine, selectedVisits);
    });
  });

  page.querySelectorAll<HTMLButtonElement>("[data-clube-visits]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedVisits = Number(button.dataset.clubeVisits || DEFAULT_VISITS);
      updateCalculator(page, selectedRoutine, selectedVisits);
    });
  });

  updateCalculator(page, selectedRoutine, selectedVisits);

  page.querySelectorAll<HTMLButtonElement>(".membership-sales-trigger").forEach((button) => {
    button.addEventListener("click", () => triggerPrimaryAction(page, button));
  });

  if (state !== "active") {
    const sticky = document.createElement("div");
    sticky.className = "membership-sales-sticky";
    sticky.innerHTML = `<div><small>CLUBE YURI</small><strong>R$ 120/mês</strong></div><button type="button">${primaryLabel(state)}</button>`;
    const stickyButton = sticky.querySelector<HTMLButtonElement>("button");
    stickyButton?.addEventListener("click", () => triggerPrimaryAction(page, stickyButton));
    page.appendChild(sticky);
  }
}

function scanMembershipPages() {
  document.querySelectorAll<HTMLElement>(".membership-page").forEach(enhanceMembershipPage);
}

export default function SubscriptionSalesEnhancer() {
  useEffect(() => {
    scanMembershipPages();
    const observer = new MutationObserver(scanMembershipPages);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
