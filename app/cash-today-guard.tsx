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

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function activeAdminSection() {
  const active = document.querySelector<HTMLButtonElement>(".sidebar nav button.active");
  if (!active) return "";
  const textOnly = Array.from(active.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent || "")
    .join(" ");
  return normalize(textOnly || active.textContent);
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

  dashboard.dataset.todayQaLoading = "true";
  try {
    const response = await fetch("/api/data", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    if (!data.isAdmin) return;

    const today = saoPauloToday();
    const month = today.slice(0, 7);
    const transactions = data.transactions || [];
    const appointments = data.appointments || [];

    const todayTransactions = transactions.filter((item: any) => item.date === today);
    const todayEntries = todayTransactions.filter((item: any) => normalize(item.kind) === "entrada");
    const todayRevenue = todayEntries.reduce((sum: number, item: any) => sum + Number(item.amountCents || 0), 0);

    const monthTransactions = transactions.filter((item: any) => String(item.date || "").startsWith(month));
    const monthBalance = monthTransactions.reduce(
      (sum: number, item: any) => sum + (normalize(item.kind) === "entrada" ? Number(item.amountCents || 0) : -Number(item.amountCents || 0)),
      0,
    );

    // Uma entrada vinculada a serviço representa um atendimento já realizado,
    // seja finalização de agendamento ou lançamento manual diretamente no Caixa.
    const serviceEntries = todayEntries.filter((item: any) => Boolean(item.serviceId || String(item.serviceName || "").trim()));
    const coveredAppointmentIds = new Set(
      serviceEntries.map((item: any) => Number(item.appointmentId || 0)).filter((id: number) => id > 0),
    );
    const coveredTransactionIds = new Set(serviceEntries.map((item: any) => Number(item.id || 0)));

    // Compatibilidade com atendimentos antigos finalizados que possam não ter
    // uma transação vinculada corretamente.
    const legacyFinalized = appointments.filter((item: any) => {
      if (item.date !== today || item.status !== "Finalizado") return false;
      const appointmentId = Number(item.id || 0);
      const cashTransactionId = Number(item.cashTransactionId || 0);
      return !coveredAppointmentIds.has(appointmentId) && !(cashTransactionId && coveredTransactionIds.has(cashTransactionId));
    });

    const completedCount = serviceEntries.length + legacyFinalized.length;
    const completedRevenue =
      serviceEntries.reduce((sum: number, item: any) => sum + Number(item.amountCents || 0), 0) +
      legacyFinalized.reduce((sum: number, item: any) => sum + Number(item.totalCents || 0), 0);
    const ticket = completedCount ? Math.round(completedRevenue / completedCount) : 0;

    const cards = [...dashboard.querySelectorAll<HTMLElement>(".metric")];
    const findCard = (...labels: string[]) => cards.find((card) => labels.includes(normalize(card.querySelector("small")?.textContent)));

    const revenueCard = findCard("faturamento hoje");
    if (revenueCard) {
      const value = revenueCard.querySelector<HTMLElement>("strong");
      const hint = revenueCard.querySelector<HTMLElement>("span");
      if (value) value.textContent = formatMoney(todayRevenue);
      if (hint) hint.textContent = "Entradas registradas no caixa hoje";
    }

    const appointmentsCard = findCard("atendimentos", "atendimentos finalizados", "atendimentos realizados");
    if (appointmentsCard) {
      const label = appointmentsCard.querySelector<HTMLElement>("small");
      const value = appointmentsCard.querySelector<HTMLElement>("strong");
      const hint = appointmentsCard.querySelector<HTMLElement>("span");
      if (label) label.textContent = "Atendimentos finalizados";
      if (value) value.textContent = String(completedCount);
      if (hint) hint.textContent = completedCount ? "Serviços concluídos e lançados no caixa hoje" : "Nenhum serviço concluído hoje";
    }

    const ticketCard = findCard("ticket médio");
    if (ticketCard) {
      const value = ticketCard.querySelector<HTMLElement>("strong");
      const hint = ticketCard.querySelector<HTMLElement>("span");
      if (value) value.textContent = formatMoney(ticket);
      if (hint) hint.textContent = "Média dos serviços concluídos hoje";
    }

    const monthCard = findCard("saldo do mês");
    if (monthCard) {
      const value = monthCard.querySelector<HTMLElement>("strong");
      const hint = monthCard.querySelector<HTMLElement>("span");
      if (value) value.textContent = formatMoney(monthBalance);
      if (hint) hint.textContent = "Entradas - saídas";
    }
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
      let response: Response;
      try {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url.endsWith("/api/data") && typeof init?.body === "string" && activeAdminSection() === "caixa") {
          const payload = JSON.parse(init.body);
          if (payload?.action === "transaction") {
            response = await originalFetch("/api/cash/transaction", {
              ...init,
              body: JSON.stringify({ ...payload, date: saoPauloToday() }),
            });
            if (response.ok) window.setTimeout(() => void refreshDashboardMetrics(), 0);
            return response;
          }
        }
      } catch {
        // Se não for possível inspecionar a chamada, preserva o fetch original.
      }
      response = await originalFetch(input, init);
      return response;
    };

    let queued = false;
    let dashboardTimer: number | null = null;
    const scan = () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(() => {
        queued = false;
        lockCashDate();
        if (dashboardTimer) window.clearTimeout(dashboardTimer);
        dashboardTimer = window.setTimeout(() => void refreshDashboardMetrics(), 140);
      });
    };

    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    scan();

    return () => {
      window.fetch = originalFetch;
      observer.disconnect();
      if (dashboardTimer) window.clearTimeout(dashboardTimer);
    };
  }, []);

  return null;
}
