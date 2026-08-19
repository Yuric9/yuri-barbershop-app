"use client";

import { useEffect } from "react";

function normalize(value: string | null | undefined) {
  return String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
}

function saoPauloToday() {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";
  return `${year}-${month}-${day}`;
}

function activeAdminSection() {
  const active = document.querySelector<HTMLButtonElement>(".sidebar nav button.active");
  return normalize(active?.textContent);
}

function lockCashDate() {
  if (activeAdminSection() !== "caixa") return;
  const heading = [...document.querySelectorAll<HTMLElement>("h2")].find((node) => normalize(node.textContent) === "movimentações do mês");
  const section = heading?.closest("section");
  if (!section) return;

  const dateInput = section.querySelector<HTMLInputElement>('input[type="date"]');
  if (dateInput) {
    const today = saoPauloToday();
    if (dateInput.value !== today) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(dateInput, today);
      dateInput.dispatchEvent(new Event("input", { bubbles: true }));
      dateInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
    dateInput.disabled = true;
    dateInput.setAttribute("aria-label", "Data de hoje — definida automaticamente");
    dateInput.title = "No Caixa, os lançamentos são sempre registrados na data de hoje. Para dias anteriores, use Relatórios.";
    dateInput.closest("label")?.classList.add("cash-today-date");
  }

  const clientButton = section.querySelector<HTMLButtonElement>(".cash-new-client");
  if (clientButton) {
    clientButton.classList.add("cash-new-client-visible");
    clientButton.setAttribute("aria-label", "Cadastrar novo cliente e vincular ao lançamento");
  }
}

async function refreshDashboardMetrics() {
  if (activeAdminSection() !== "início") return;
  const dashboard = document.querySelector<HTMLElement>(".dashboard");
  if (!dashboard || dashboard.dataset.todayQaLoading === "true") return;
  if (dashboard.dataset.todayQaDate === saoPauloToday()) return;

  dashboard.dataset.todayQaLoading = "true";
  try {
    const response = await fetch("/api/data", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    if (!data.isAdmin) return;

    const today = saoPauloToday();
    const todayRows = (data.appointments || []).filter((item: any) => item.date === today && item.status !== "Cancelado");
    const finalized = todayRows.filter((item: any) => item.status === "Finalizado");
    const notFinalized = todayRows.filter((item: any) => item.status !== "Finalizado");
    const ticket = finalized.length
      ? Math.round(finalized.reduce((sum: number, item: any) => sum + Number(item.totalCents || 0), 0) / finalized.length)
      : 0;

    const cards = [...dashboard.querySelectorAll<HTMLElement>(".metric")];
    const appointmentsCard = cards.find((card) => normalize(card.querySelector("small")?.textContent) === "atendimentos");
    if (appointmentsCard) {
      const label = appointmentsCard.querySelector<HTMLElement>("small");
      const value = appointmentsCard.querySelector<HTMLElement>("strong");
      const hint = appointmentsCard.querySelector<HTMLElement>("span");
      if (label) label.textContent = "Atendimentos finalizados";
      if (value) value.textContent = String(finalized.length);
      if (hint) hint.textContent = notFinalized.length ? `${notFinalized.length} agendado(s) ainda não finalizado(s)` : "Somente serviços concluídos hoje";
    }

    const ticketCard = cards.find((card) => normalize(card.querySelector("small")?.textContent) === "ticket médio");
    if (ticketCard) {
      const value = ticketCard.querySelector<HTMLElement>("strong");
      const hint = ticketCard.querySelector<HTMLElement>("span");
      if (value) value.textContent = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(ticket / 100);
      if (hint) hint.textContent = "Média dos atendimentos finalizados hoje";
    }

    dashboard.dataset.todayQaDate = today;
  } catch {
    // Mantém a tela original caso a consulta de conferência falhe.
  } finally {
    dashboard.dataset.todayQaLoading = "false";
  }
}

export default function CashTodayGuard() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url.endsWith("/api/data") && typeof init?.body === "string" && activeAdminSection() === "caixa") {
          const payload = JSON.parse(init.body);
          if (payload?.action === "transaction") {
            return originalFetch("/api/cash/transaction", {
              ...init,
              body: JSON.stringify({ ...payload, date: saoPauloToday() }),
            });
          }
        }
      } catch {
        // Se não for possível inspecionar a chamada, preserva o fetch original.
      }
      return originalFetch(input, init);
    };

    let dashboardTimer: number | null = null;
    const scan = () => {
      lockCashDate();
      if (dashboardTimer) window.clearTimeout(dashboardTimer);
      dashboardTimer = window.setTimeout(() => void refreshDashboardMetrics(), 120);
    };

    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    scan();

    return () => {
      window.fetch = originalFetch;
      observer.disconnect();
      if (dashboardTimer) window.clearTimeout(dashboardTimer);
    };
  }, []);

  return null;
}
