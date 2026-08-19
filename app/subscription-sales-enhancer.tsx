"use client";

import { useEffect } from "react";

const PLAN_PRICE = 120;
const FULL_VISIT_PRICE = 75;
const DEFAULT_VISITS = 4;

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
  if (state === "pending") return "CONTINUAR ASSINATURA NO MERCADO PAGO";
  if (state === "cancelled") return "ASSINAR NOVAMENTE";
  if (state === "blocked") return "FALAR COM A BARBEARIA";
  return "QUERO ASSINAR O CLUBE YURI";
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
    window.open("https://wa.me/5562981007636?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20minha%20assinatura%20do%20Clube%20Yuri.", "_blank", "noopener,noreferrer");
    return;
  }
  const target = findPaymentButton(page);
  if (target) {
    target.click();
    return;
  }
  if (attempt < 12) {
    source.disabled = true;
    source.textContent = "PREPARANDO PAGAMENTO SEGURO...";
    window.setTimeout(() => {
      source.disabled = false;
      source.textContent = primaryLabel(membershipState(page));
      triggerPrimaryAction(page, source, attempt + 1);
    }, 100);
  }
}

function updateEconomy(page: HTMLElement, visits: number) {
  const avulso = FULL_VISIT_PRICE * visits;
  const savings = Math.max(0, avulso - PLAN_PRICE);
  const discount = avulso > PLAN_PRICE ? Math.round((savings / avulso) * 100) : 0;

  page.querySelectorAll<HTMLButtonElement>("[data-clube-visits]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.clubeVisits) === visits);
    button.setAttribute("aria-pressed", Number(button.dataset.clubeVisits) === visits ? "true" : "false");
  });

  const avulsoValue = page.querySelector<HTMLElement>("[data-clube-avulso]");
  const savingsValue = page.querySelector<HTMLElement>("[data-clube-savings]");
  const savingsCopy = page.querySelector<HTMLElement>("[data-clube-savings-copy]");
  const bar = page.querySelector<HTMLElement>("[data-clube-bar]");

  if (avulsoValue) avulsoValue.textContent = money(avulso);
  if (savingsValue) savingsValue.textContent = savings > 0 ? money(savings) : "—";
  if (savingsCopy) {
    savingsCopy.textContent =
      visits === 1
        ? "Com 2 visitas no mês, o Clube já passa a valer mais que o avulso."
        : savings > 0
          ? `Economia de ${money(savings)} no mês${discount ? ` • ${discount}% a menos que no avulso` : ""}.`
          : "A partir da 2ª visita, você já começa a economizar.";
  }
  if (bar) bar.style.width = `${Math.min(100, Math.max(12, (PLAN_PRICE / Math.max(avulso, PLAN_PRICE)) * 100))}%`;
}

function enhanceMembershipPage(page: HTMLElement) {
  if (page.dataset.clubeSalesUpgraded === "1") return;
  page.dataset.clubeSalesUpgraded = "1";
  page.classList.add("membership-sales-upgraded");

  const hero = page.querySelector<HTMLElement>(".membership-hero");
  if (!hero) return;

  const eyebrow = hero.querySelector<HTMLElement>(":scope > span");
  const title = hero.querySelector<HTMLElement>(":scope > h2");
  const intro = hero.querySelector<HTMLElement>(":scope > p");
  const priceStrong = hero.querySelector<HTMLElement>(".membership-price strong");
  const priceSmall = hero.querySelector<HTMLElement>(".membership-price small");
  const originalAction = hero.querySelector<HTMLButtonElement>("button.membership-action");

  if (eyebrow) eyebrow.textContent = "♛ CLUBE YURI • MEMBRO VIP";
  if (title) title.textContent = "Seu visual em dia o mês inteiro.";
  if (intro) intro.textContent = "Corte, barba e sobrancelhas por uma mensalidade fixa. Mais praticidade para se manter alinhado sem pensar no valor de cada visita.";
  if (priceStrong) priceStrong.textContent = "R$ 120";
  if (priceSmall) priceSmall.textContent = ",00 / mês";
  if (originalAction && !originalAction.classList.contains("membership-payment-resume") && !originalAction.classList.contains("membership-payment-restart")) {
    originalAction.textContent = "Quero assinar o Clube Yuri";
  }

  const heroLimit = document.createElement("div");
  heroLimit.className = "membership-sales-limit";
  heroLimit.innerHTML = "<strong>ATÉ 6 ATENDIMENTOS</strong><span>durante cada período de 30 dias</span>";
  hero.querySelector(".membership-price")?.insertAdjacentElement("afterend", heroLimit);

  const trust = document.createElement("div");
  trust.className = "membership-sales-trust";
  trust.innerHTML = "<span>🔒 Pagamento seguro</span><span>↻ Renovação mensal</span><span>✓ Plano individual</span>";
  hero.appendChild(trust);

  const state = membershipState(page);
  const content = document.createElement("div");
  content.className = "membership-sales-content";
  content.innerHTML = `
    <section class="membership-sales-economy" aria-labelledby="clube-economia-title">
      <div class="membership-sales-heading">
        <small>VEJA NA PRÁTICA</small>
        <h3 id="clube-economia-title">Quanto você economiza no mês?</h3>
        <p>Considere o visual completo no avulso: corte + barba + sobrancelhas = <strong>${money(FULL_VISIT_PRICE)}</strong> por visita.</p>
      </div>
      <div class="membership-visit-picker" role="group" aria-label="Quantidade de visitas no mês">
        <span>Quantas vezes você quer manter o visual em dia?</span>
        <div>${[1, 2, 3, 4, 5, 6].map((visit) => `<button type="button" data-clube-visits="${visit}" aria-pressed="false">${visit}x</button>`).join("")}</div>
      </div>
      <div class="membership-economy-card">
        <div class="membership-economy-column muted"><small>PAGANDO AVULSO</small><strong data-clube-avulso>${money(FULL_VISIT_PRICE * DEFAULT_VISITS)}</strong><span>no mês</span></div>
        <div class="membership-economy-vs">VS</div>
        <div class="membership-economy-column gold"><small>CLUBE YURI</small><strong>${money(PLAN_PRICE)}</strong><span>por mês</span></div>
      </div>
      <div class="membership-economy-result">
        <div><small>SUA ECONOMIA</small><strong data-clube-savings>${money(FULL_VISIT_PRICE * DEFAULT_VISITS - PLAN_PRICE)}</strong></div>
        <p data-clube-savings-copy></p>
        <div class="membership-economy-track"><span data-clube-bar></span></div>
      </div>
      <div class="membership-anchor-row">
        <article><span>2x</span><div><b>R$ 150 avulso</b><small>O Clube já sai mais barato.</small></div></article>
        <article><span>4x</span><div><b>R$ 300 avulso</b><small>Economia de R$ 180.</small></div></article>
        <article><span>6x</span><div><b>R$ 450 avulso</b><small>Economia de R$ 330.</small></div></article>
      </div>
    </section>

    <section class="membership-vip-card" aria-labelledby="clube-vip-title">
      <div class="membership-vip-badge">CLUBE YURI • VIP</div>
      <div class="membership-vip-top">
        <div><small>UM ÚNICO PLANO</small><h3 id="clube-vip-title">Membro Clube Yuri</h3><p>Seu visual completo durante o mês, com uma mensalidade previsível.</p></div>
        <div class="membership-vip-price"><strong>R$ 120</strong><span>/ mês</span></div>
      </div>
      <div class="membership-vip-benefits">
        <span>✓ Corte, barba e sobrancelhas durante o período</span>
        <span>✓ Até 6 atendimentos em 30 dias</span>
        <span>✓ Agendamento online</span>
        <span>✓ Prioridade para membros do Clube</span>
        <span>✓ Plano pessoal e intransferível</span>
        <span>✓ Pagamento recorrente e seguro pelo Mercado Pago</span>
      </div>
      <button type="button" class="membership-sales-trigger" ${state === "active" ? "disabled" : ""}>${primaryLabel(state)}</button>
      <small class="membership-vip-note">Atendimentos mediante agendamento e disponibilidade. Produtos não estão incluídos.</small>
    </section>

    <section class="membership-how">
      <div class="membership-sales-heading"><small>SIMPLES DE USAR</small><h3>Como funciona</h3></div>
      <div class="membership-how-grid">
        <article><b>01</b><h4>Entre para o Clube</h4><p>Assine por R$ 120 e conclua o pagamento no ambiente seguro do Mercado Pago.</p></article>
        <article><b>02</b><h4>Agende seu horário</h4><p>Escolha um horário disponível normalmente pelo nosso sistema.</p></article>
        <article><b>03</b><h4>Mantenha o visual em dia</h4><p>Use seus benefícios durante os 30 dias de vigência do plano.</p></article>
      </div>
    </section>

    <section class="membership-faq">
      <div class="membership-sales-heading"><small>SEM LETRAS MIÚDAS</small><h3>Perguntas frequentes</h3></div>
      <div class="membership-faq-list">
        <details><summary>Quantas vezes posso ir?</summary><p>O Clube Yuri permite até 6 atendimentos durante cada período de 30 dias, sempre mediante agendamento e disponibilidade.</p></details>
        <details><summary>Como funciona a cobrança?</summary><p>A mensalidade é de R$ 120 e a cobrança recorrente é processada com segurança pelo Mercado Pago.</p></details>
        <details><summary>O plano pode ser compartilhado?</summary><p>Não. A assinatura é pessoal e intransferível, vinculada ao titular cadastrado.</p></details>
        <details><summary>Preciso agendar?</summary><p>Sim. O Clube dá acesso aos benefícios, mas os atendimentos continuam sujeitos aos horários disponíveis na agenda.</p></details>
        <details><summary>Os atendimentos acumulam?</summary><p>Não. O limite vale para o período ativo de 30 dias e não é transferido para o período seguinte.</p></details>
      </div>
    </section>

    <section class="membership-final-cta">
      <small>CLUBE YURI</small>
      <h3>Você pode gastar até R$ 450 no avulso.</h3>
      <p>No Clube Yuri, sua mensalidade continua em <strong>R$ 120.</strong></p>
      <button type="button" class="membership-sales-trigger" ${state === "active" ? "disabled" : ""}>${primaryLabel(state)}</button>
      <span>Pagamento seguro pelo Mercado Pago</span>
    </section>
  `;

  const oldBenefits = page.querySelector<HTMLElement>(".membership-benefits");
  if (oldBenefits) oldBenefits.insertAdjacentElement("beforebegin", content);
  else page.appendChild(content);

  page.querySelectorAll<HTMLButtonElement>("[data-clube-visits]").forEach((button) => {
    button.addEventListener("click", () => updateEconomy(page, Number(button.dataset.clubeVisits || DEFAULT_VISITS)));
  });
  updateEconomy(page, DEFAULT_VISITS);

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
