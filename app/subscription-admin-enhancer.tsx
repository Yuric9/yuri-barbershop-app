"use client";

import { useEffect } from "react";

type AdminSubscription = {
  id: number;
  clientName: string;
  clientEmail: string;
  phone: string;
  status: string;
  priceCents: number;
  startDate: string;
  endDate: string;
  adminMessage: string;
  usageCount: number;
  usageRawCount: number;
  usageLimit: number;
  lastVisit: { date: string; time: string; serviceName: string } | null;
  nextAppointment: { date: string; time: string; serviceName: string; status: string } | null;
  providerConnected: boolean;
  providerStatus: string;
  nextRenewal: string;
  daysUntilRenewal: number | null;
  providerUpdatedAt: string;
};

type AdminPayload = {
  ok: boolean;
  today: string;
  metrics: {
    active: number;
    recurringCents: number;
    pending: number;
    renewSoon: number;
    blocked: number;
    cancelled: number;
  };
  subscriptions: AdminSubscription[];
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((Number(cents) || 0) / 100);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate(value);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function slug(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
}

function providerLabel(value: string, connected: boolean) {
  if (!connected) return "Sem vínculo";
  const normalized = String(value || "").toLowerCase();
  if (normalized === "authorized") return "Autorizado";
  if (normalized === "pending") return "Pendente";
  if (normalized === "paused") return "Pausado";
  if (["cancelled", "canceled"].includes(normalized)) return "Cancelado";
  return value || "Conectado";
}

function usageDots(item: AdminSubscription) {
  return Array.from({ length: item.usageLimit || 6 }, (_, index) =>
    `<span class="${index < item.usageCount ? "used" : ""}"></span>`,
  ).join("");
}

function whatsappUrl(item: AdminSubscription) {
  const digits = String(item.phone || "").replace(/\D/g, "");
  if (!digits) return "";
  const phone = digits.startsWith("55") ? digits : `55${digits}`;
  const text = encodeURIComponent(`Olá, ${item.clientName.split(" ")[0]}! Estou entrando em contato sobre o seu Clube Yuri.`);
  return `https://wa.me/${phone}?text=${text}`;
}

function findLegacyAdmin() {
  return [...document.querySelectorAll<HTMLElement>("section")].find((section) =>
    /gestão de assinantes/i.test(section.querySelector("h2")?.textContent || ""),
  );
}

async function sendInternalMessage(item: AdminSubscription, message: string) {
  const response = await fetch("/api/data", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "subscription-manage", id: item.id, operation: "message", message }),
  });
  if (!response.ok) throw new Error("Não foi possível enviar a mensagem.");
}

export default function SubscriptionAdminEnhancer() {
  useEffect(() => {
    let destroyed = false;
    let payload: AdminPayload | null = null;
    let tab = "overview";
    let search = "";
    let status = "Todos";
    let selectedId: number | null = null;
    let loading = false;
    let feedback = "";

    function legacyCampaign() {
      return document.querySelector<HTMLElement>(".campaign-manager");
    }

    function setLegacyVisibility() {
      const campaign = legacyCampaign();
      if (campaign) {
        campaign.classList.add("clube-admin-campaign-legacy");
        campaign.style.display = tab === "campaigns" ? "block" : "none";
      }
      const oldAdmin = findLegacyAdmin();
      if (oldAdmin) {
        oldAdmin.classList.add("clube-admin-legacy-hidden");
        oldAdmin.style.display = "none";
      }
    }

    async function load() {
      if (loading) return;
      loading = true;
      feedback = "";
      render();
      try {
        const response = await fetch("/api/admin/subscriptions", { cache: "no-store" });
        if (!response.ok) throw new Error();
        payload = (await response.json()) as AdminPayload;
      } catch {
        feedback = "Não foi possível carregar os dados administrativos do Clube Yuri.";
      } finally {
        loading = false;
        render();
      }
    }

    function filteredRows() {
      const rows = payload?.subscriptions || [];
      const term = search.trim().toLowerCase();
      return rows.filter((item) => {
        const matchesSearch = !term || `${item.clientName} ${item.clientEmail} ${item.phone}`.toLowerCase().includes(term);
        const matchesStatus = status === "Todos" || item.status === status;
        return matchesSearch && matchesStatus;
      });
    }

    function metric(label: string, value: string, hint: string) {
      return `<article class="clube-admin-metric"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong><span>${escapeHtml(hint)}</span></article>`;
    }

    function statusBadge(item: AdminSubscription) {
      return `<span class="clube-admin-status ${slug(item.status)}">${escapeHtml(item.status)}</span>`;
    }

    function memberCard(item: AdminSubscription) {
      const renewal = item.nextRenewal ? formatDate(item.nextRenewal) : "—";
      return `<article class="clube-admin-member" data-open-member="${item.id}">
        <div class="clube-admin-member-head">
          <div><strong>${escapeHtml(item.clientName)}</strong><small>${escapeHtml(item.clientEmail)}</small></div>
          ${statusBadge(item)}
        </div>
        <div class="clube-admin-usage-line">
          <div><small>ATENDIMENTOS NO CICLO</small><b>${item.usageCount} de ${item.usageLimit}</b></div>
          <div class="clube-admin-dots" aria-label="${item.usageCount} de ${item.usageLimit} atendimentos">${usageDots(item)}</div>
        </div>
        <div class="clube-admin-member-meta">
          <span><small>Próxima renovação</small><b>${renewal}</b></span>
          <span><small>Mercado Pago</small><b>${escapeHtml(providerLabel(item.providerStatus, item.providerConnected))}</b></span>
        </div>
        <button type="button" class="clube-admin-link" data-open-member="${item.id}">Ver detalhes <span>→</span></button>
      </article>`;
    }

    function overviewHtml() {
      const rows = payload?.subscriptions || [];
      const attention = rows
        .filter((item) => item.status === "Aguardando pagamento" || item.status === "Bloqueada" || item.usageCount >= 5 || (item.daysUntilRenewal !== null && item.daysUntilRenewal >= 0 && item.daysUntilRenewal <= 7))
        .slice(0, 6);
      return `<div class="clube-admin-overview">
        <div class="clube-admin-subheading"><div><small>ATENÇÃO</small><h3>O que precisa do seu olhar</h3></div></div>
        <div class="clube-admin-attention">
          ${attention.length ? attention.map((item) => `<button type="button" data-open-member="${item.id}">
            <span>${escapeHtml(item.clientName)}</span>
            <b>${item.status === "Aguardando pagamento" ? "Pagamento pendente" : item.status === "Bloqueada" ? "Assinatura bloqueada" : item.usageCount >= 6 ? "6 de 6 utilizados" : item.usageCount === 5 ? "5 de 6 utilizados" : `Renova em ${item.daysUntilRenewal} dia(s)`}</b>
            <i>→</i>
          </button>`).join("") : `<div class="clube-admin-empty">Nenhum alerta importante agora.</div>`}
        </div>
        <div class="clube-admin-subheading"><div><small>ASSINANTES</small><h3>Visão rápida</h3></div><button type="button" data-go-tab="members">Ver todos</button></div>
        <div class="clube-admin-grid">${rows.slice(0, 4).map(memberCard).join("") || `<div class="clube-admin-empty">Nenhum assinante cadastrado.</div>`}</div>
      </div>`;
    }

    function membersHtml() {
      const rows = filteredRows();
      const statuses = ["Todos", "Ativa", "Aguardando pagamento", "Bloqueada", "Vencida", "Cancelada"];
      return `<div class="clube-admin-members-view">
        <div class="clube-admin-toolbar">
          <label class="clube-admin-search"><span>⌕</span><input type="search" value="${escapeHtml(search)}" placeholder="Buscar por nome, e-mail ou telefone" /></label>
          <select class="clube-admin-filter" aria-label="Filtrar assinaturas">${statuses.map((option) => `<option ${status === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select>
        </div>
        <div class="clube-admin-result-count">${rows.length} resultado(s)</div>
        <div class="clube-admin-grid">${rows.map(memberCard).join("") || `<div class="clube-admin-empty">Nenhum assinante encontrado com esse filtro.</div>`}</div>
      </div>`;
    }

    function renewalsHtml() {
      const rows = (payload?.subscriptions || [])
        .filter((item) => item.nextRenewal || item.providerConnected)
        .slice()
        .sort((a, b) => String(a.nextRenewal || "9999").localeCompare(String(b.nextRenewal || "9999")));
      return `<div class="clube-admin-renewals">
        <div class="clube-admin-subheading"><div><small>MERCADO PAGO</small><h3>Renovações e status</h3><p>Esta área mostra o estado sincronizado da assinatura e a próxima renovação registrada.</p></div></div>
        <div class="clube-admin-renewal-list">
          ${rows.length ? rows.map((item) => `<button type="button" data-open-member="${item.id}">
            <div><strong>${escapeHtml(item.clientName)}</strong><small>${escapeHtml(item.clientEmail)}</small></div>
            <span><small>Próxima renovação</small><b>${formatDate(item.nextRenewal)}</b></span>
            <span><small>Mercado Pago</small><b>${escapeHtml(providerLabel(item.providerStatus, item.providerConnected))}</b></span>
            <i>→</i>
          </button>`).join("") : `<div class="clube-admin-empty">Ainda não há renovações vinculadas ao Mercado Pago.</div>`}
        </div>
      </div>`;
    }

    function campaignsHtml() {
      return `<div class="clube-admin-campaign-intro">
        <div><small>DIVULGAÇÃO</small><h3>Campanhas do Clube Yuri</h3><p>Os criativos continuam no mesmo sistema de publicação, agora separados da gestão dos assinantes para deixar o painel mais limpo.</p></div>
        <span>O gerenciador de criativos aparece logo abaixo.</span>
      </div>`;
    }

    function detailHtml(item: AdminSubscription) {
      const wa = whatsappUrl(item);
      return `<div class="clube-admin-drawer-backdrop" data-close-drawer></div>
        <aside class="clube-admin-drawer" aria-label="Detalhes da assinatura">
          <div class="clube-admin-drawer-head"><div><small>MEMBRO CLUBE YURI</small><h3>${escapeHtml(item.clientName)}</h3><p>${escapeHtml(item.clientEmail)}</p></div><button type="button" data-close-drawer aria-label="Fechar">×</button></div>
          <div class="clube-admin-drawer-status">${statusBadge(item)}<span>${escapeHtml(providerLabel(item.providerStatus, item.providerConnected))} no Mercado Pago</span></div>
          <section class="clube-admin-drawer-section">
            <small>UTILIZAÇÃO DO CICLO</small>
            <div class="clube-admin-drawer-usage"><strong>${item.usageCount}/${item.usageLimit}</strong><div class="clube-admin-dots large">${usageDots(item)}</div></div>
            <p>${item.usageRawCount > item.usageLimit ? `${item.usageRawCount} atendimentos finalizados foram encontrados no período.` : "Contagem baseada nos atendimentos finalizados dentro do ciclo atual."}</p>
          </section>
          <div class="clube-admin-detail-grid">
            <span><small>Início</small><b>${formatDate(item.startDate)}</b></span>
            <span><small>Fim do ciclo</small><b>${formatDate(item.endDate)}</b></span>
            <span><small>Próxima renovação</small><b>${formatDate(item.nextRenewal)}</b></span>
            <span><small>Mensalidade</small><b>${money(item.priceCents)}</b></span>
          </div>
          <section class="clube-admin-drawer-section"><small>ATENDIMENTOS</small>
            <div class="clube-admin-visit-row"><span>Último atendimento</span><b>${item.lastVisit ? `${formatDate(item.lastVisit.date)} • ${escapeHtml(item.lastVisit.serviceName)}` : "Nenhum finalizado"}</b></div>
            <div class="clube-admin-visit-row"><span>Próximo agendamento</span><b>${item.nextAppointment ? `${formatDate(item.nextAppointment.date)} às ${escapeHtml(item.nextAppointment.time)} • ${escapeHtml(item.nextAppointment.serviceName)}` : "Nenhum agendado"}</b></div>
          </section>
          <section class="clube-admin-drawer-section"><small>SINCRONIZAÇÃO</small>
            <div class="clube-admin-visit-row"><span>Última atualização</span><b>${formatDateTime(item.providerUpdatedAt)}</b></div>
            <button type="button" class="clube-admin-secondary" data-sync-member="${item.id}">↻ Sincronizar com Mercado Pago</button>
          </section>
          <section class="clube-admin-drawer-section"><small>CONTATO</small>
            <textarea class="clube-admin-message" placeholder="Escreva uma mensagem para o assinante...">${escapeHtml(item.adminMessage || "")}</textarea>
            <div class="clube-admin-contact-actions">
              <button type="button" class="clube-admin-primary" data-send-message="${item.id}">Enviar mensagem interna</button>
              ${wa ? `<a href="${wa}" target="_blank" rel="noreferrer">Abrir WhatsApp</a>` : `<span class="clube-admin-no-phone">Sem telefone cadastrado</span>`}
            </div>
          </section>
          <p class="clube-admin-safe-note">As ações deste painel não alteram o checkout nem as credenciais do Mercado Pago. Cancelamentos e bloqueios financeiros continuam fora desta tela até termos o controle do provedor totalmente seguro.</p>
        </aside>`;
    }

    function render() {
      if (destroyed) return;
      const campaign = legacyCampaign();
      const oldAdmin = findLegacyAdmin();
      if (!campaign || !oldAdmin) return;
      let root = document.getElementById("clube-admin-pro") as HTMLElement | null;
      if (!root) {
        root = document.createElement("section");
        root.id = "clube-admin-pro";
        root.className = "clube-admin-pro";
        campaign.insertAdjacentElement("beforebegin", root);
      }
      setLegacyVisibility();

      const metrics = payload?.metrics || { active: 0, recurringCents: 0, pending: 0, renewSoon: 0, blocked: 0, cancelled: 0 };
      const selected = selectedId ? payload?.subscriptions.find((item) => item.id === selectedId) || null : null;
      root.innerHTML = `
        <div class="clube-admin-hero">
          <div><small>♛ CLUBE YURI • ADMIN</small><h2>Gestão do Clube</h2><p>Assinantes, utilização e renovações em um único lugar.</p></div>
          <button type="button" class="clube-admin-refresh" ${loading ? "disabled" : ""}>${loading ? "Atualizando..." : "↻ Atualizar"}</button>
        </div>
        <div class="clube-admin-metrics">
          ${metric("ASSINANTES ATIVOS", String(metrics.active), "membros com ciclo ativo")}
          ${metric("RECEITA RECORRENTE", money(metrics.recurringCents), "valor mensal contratado")}
          ${metric("AGUARDANDO PAGAMENTO", String(metrics.pending), "assinaturas pendentes")}
          ${metric("RENOVAM EM 7 DIAS", String(metrics.renewSoon), "acompanhe de perto")}
        </div>
        <nav class="clube-admin-tabs" aria-label="Seções da gestão de assinaturas">
          <button type="button" class="${tab === "overview" ? "active" : ""}" data-tab="overview">Visão geral</button>
          <button type="button" class="${tab === "members" ? "active" : ""}" data-tab="members">Assinantes</button>
          <button type="button" class="${tab === "renewals" ? "active" : ""}" data-tab="renewals">Renovações</button>
          <button type="button" class="${tab === "campaigns" ? "active" : ""}" data-tab="campaigns">Campanhas</button>
        </nav>
        ${feedback ? `<p class="clube-admin-feedback">${escapeHtml(feedback)}</p>` : ""}
        <div class="clube-admin-body">${loading && !payload ? `<div class="clube-admin-loading">Carregando dados do Clube Yuri...</div>` : tab === "overview" ? overviewHtml() : tab === "members" ? membersHtml() : tab === "renewals" ? renewalsHtml() : campaignsHtml()}</div>
        ${selected ? detailHtml(selected) : ""}
      `;

      root.querySelector<HTMLButtonElement>(".clube-admin-refresh")?.addEventListener("click", load);
      root.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((button) => button.addEventListener("click", () => {
        tab = button.dataset.tab || "overview";
        selectedId = null;
        render();
      }));
      root.querySelectorAll<HTMLButtonElement>("[data-go-tab]").forEach((button) => button.addEventListener("click", () => {
        tab = button.dataset.goTab || "members";
        render();
      }));
      root.querySelector<HTMLInputElement>(".clube-admin-search input")?.addEventListener("input", (event) => {
        search = (event.target as HTMLInputElement).value;
        render();
        const input = document.querySelector<HTMLInputElement>("#clube-admin-pro .clube-admin-search input");
        input?.focus();
        if (input) input.setSelectionRange(input.value.length, input.value.length);
      });
      root.querySelector<HTMLSelectElement>(".clube-admin-filter")?.addEventListener("change", (event) => {
        status = (event.target as HTMLSelectElement).value;
        render();
      });
      root.querySelectorAll<HTMLElement>("[data-open-member]").forEach((element) => element.addEventListener("click", () => {
        selectedId = Number(element.dataset.openMember || 0);
        render();
      }));
      root.querySelectorAll<HTMLElement>("[data-close-drawer]").forEach((element) => element.addEventListener("click", () => {
        selectedId = null;
        render();
      }));
      root.querySelector<HTMLButtonElement>("[data-sync-member]")?.addEventListener("click", async (event) => {
        const button = event.currentTarget as HTMLButtonElement;
        button.disabled = true;
        button.textContent = "Sincronizando...";
        try {
          const response = await fetch("/api/admin/subscriptions", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "sync", id: Number(button.dataset.syncMember) }),
          });
          if (!response.ok) throw new Error();
          feedback = "Assinatura sincronizada com o Mercado Pago.";
          await load();
        } catch {
          feedback = "Não foi possível sincronizar esta assinatura agora.";
          render();
        }
      });
      root.querySelector<HTMLButtonElement>("[data-send-message]")?.addEventListener("click", async (event) => {
        const button = event.currentTarget as HTMLButtonElement;
        const item = payload?.subscriptions.find((row) => row.id === Number(button.dataset.sendMessage));
        const textarea = root?.querySelector<HTMLTextAreaElement>(".clube-admin-message");
        if (!item || !textarea?.value.trim()) return;
        button.disabled = true;
        button.textContent = "Enviando...";
        try {
          await sendInternalMessage(item, textarea.value.trim());
          feedback = "Mensagem enviada ao assinante.";
          await load();
        } catch {
          feedback = "Não foi possível enviar a mensagem.";
          render();
        }
      });
      setLegacyVisibility();
    }

    function scan() {
      if (destroyed) return;
      const campaign = legacyCampaign();
      const admin = findLegacyAdmin();
      if (campaign && admin) {
        render();
        if (!payload && !loading) void load();
      }
    }

    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    scan();

    return () => {
      destroyed = true;
      observer.disconnect();
      document.getElementById("clube-admin-pro")?.remove();
      const campaign = legacyCampaign();
      if (campaign) campaign.style.display = "";
      const admin = findLegacyAdmin();
      if (admin) admin.style.display = "";
    };
  }, []);

  return null;
}
