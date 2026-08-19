"use client";

import { useEffect } from "react";

type ArchivedSubscription = {
  id: number;
  clientName: string;
  clientEmail: string;
  phone: string;
  status: string;
  statusAtArchive: string;
  archivedAt: string;
  note: string;
  priceCents: number;
  startDate: string;
  endDate: string;
  lastVisit: { date: string; time: string; serviceName: string } | null;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
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

function whatsappUrl(item: ArchivedSubscription) {
  const digits = String(item.phone || "").replace(/\D/g, "");
  if (!digits) return "";
  const phone = digits.startsWith("55") ? digits : `55${digits}`;
  const firstName = item.clientName.trim().split(" ")[0] || "";
  const text = encodeURIComponent(
    `Olá, ${firstName}! Tudo bem? Aqui é da Yuri Barbershop. Estou entrando em contato sobre o Clube Yuri. Se quiser, posso te passar as condições para voltar a ser membro.`,
  );
  return `https://wa.me/${phone}?text=${text}`;
}

async function archiveRequest(action: "archive" | "restore", id: number) {
  const response = await fetch("/api/admin/subscriptions/archive", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, id }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Não foi possível concluir esta ação.");
}

export default function SubscriptionArchiveEnhancer() {
  useEffect(() => {
    let destroyed = false;
    let archiveMode = false;
    let loading = false;
    let loaded = false;
    let scanScheduled = false;
    let archived: ArchivedSubscription[] = [];
    let search = "";
    let feedback = "";

    function root() {
      return document.getElementById("clube-admin-pro") as HTMLElement | null;
    }

    async function loadArchived() {
      if (loading || !root()) return;
      loading = true;
      renderArchiveTab();
      try {
        const response = await fetch("/api/admin/subscriptions/archive", { cache: "no-store" });
        if (!response.ok) throw new Error();
        const data = await response.json();
        archived = data.archived || [];
        feedback = "";
      } catch {
        feedback = "Não foi possível carregar os assinantes arquivados agora.";
      } finally {
        loaded = true;
        loading = false;
        renderArchiveTab();
        if (archiveMode) renderArchiveView();
      }
    }

    function bindRegularTabs(host: HTMLElement) {
      host.querySelectorAll<HTMLButtonElement>(".clube-admin-tabs [data-tab]").forEach((button) => {
        if (button.dataset.archiveBound === "1") return;
        button.dataset.archiveBound = "1";
        button.addEventListener("click", () => {
          archiveMode = false;
          host.classList.remove("clube-admin-show-archive");
          host.querySelector(".clube-admin-archive-view")?.remove();
        });
      });
    }

    function renderArchiveTab() {
      if (destroyed) return;
      const host = root();
      const tabs = host?.querySelector<HTMLElement>(".clube-admin-tabs");
      if (!host || !tabs) return;
      bindRegularTabs(host);
      let button = tabs.querySelector<HTMLButtonElement>("[data-archive-tab]");
      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.dataset.archiveTab = "1";
        tabs.appendChild(button);
        button.addEventListener("click", () => {
          archiveMode = true;
          tabs.querySelectorAll("button").forEach((tabButton) => tabButton.classList.remove("active"));
          button?.classList.add("active");
          renderArchiveView();
          if (!loading) void loadArchived();
        });
      }
      const label = `Arquivados${archived.length ? ` (${archived.length})` : ""}`;
      if (button.textContent !== label) button.textContent = label;
      button.classList.toggle("active", archiveMode);
    }

    function archiveCard(item: ArchivedSubscription) {
      const wa = whatsappUrl(item);
      return `<article class="clube-archive-card">
        <div class="clube-archive-card-head">
          <div><strong>${escapeHtml(item.clientName)}</strong><small>${escapeHtml(item.clientEmail)}</small></div>
          <span>${escapeHtml(item.statusAtArchive || item.status)}</span>
        </div>
        <div class="clube-archive-meta">
          <span><small>Arquivado em</small><b>${formatDateTime(item.archivedAt)}</b></span>
          <span><small>Último ciclo</small><b>${formatDate(item.startDate)} — ${formatDate(item.endDate)}</b></span>
          <span><small>Último atendimento</small><b>${item.lastVisit ? `${formatDate(item.lastVisit.date)} • ${escapeHtml(item.lastVisit.serviceName)}` : "—"}</b></span>
        </div>
        <div class="clube-archive-actions">
          ${wa ? `<a href="${wa}" target="_blank" rel="noreferrer">WhatsApp para remarketing</a>` : `<span class="clube-archive-no-phone">Sem telefone cadastrado</span>`}
          <button type="button" data-restore-subscription="${item.id}">Restaurar para Assinantes</button>
        </div>
      </article>`;
    }

    function renderArchiveView() {
      const host = root();
      if (!host || !archiveMode) return;
      host.classList.add("clube-admin-show-archive");
      host.querySelector(".clube-admin-archive-view")?.remove();
      const body = host.querySelector<HTMLElement>(".clube-admin-body");
      if (!body) return;
      const term = search.trim().toLowerCase();
      const rows = archived.filter((item) => !term || `${item.clientName} ${item.clientEmail} ${item.phone}`.toLowerCase().includes(term));
      const view = document.createElement("div");
      view.className = "clube-admin-archive-view";
      view.innerHTML = `
        <div class="clube-archive-heading">
          <div><small>BASE PARA RELACIONAMENTO</small><h3>Ex-assinantes arquivados</h3><p>Esses clientes saem da gestão diária, mas continuam disponíveis para consulta e remarketing.</p></div>
          <span>${archived.length} arquivado(s)</span>
        </div>
        <label class="clube-archive-search"><span>⌕</span><input type="search" value="${escapeHtml(search)}" placeholder="Buscar ex-assinante" /></label>
        ${feedback ? `<p class="clube-archive-feedback">${escapeHtml(feedback)}</p>` : ""}
        <div class="clube-archive-grid">${loading ? `<div class="clube-archive-empty">Carregando arquivados...</div>` : rows.length ? rows.map(archiveCard).join("") : `<div class="clube-archive-empty">Nenhum ex-assinante arquivado.</div>`}</div>
      `;
      body.insertAdjacentElement("afterend", view);

      view.querySelector<HTMLInputElement>(".clube-archive-search input")?.addEventListener("input", (event) => {
        search = (event.target as HTMLInputElement).value;
        renderArchiveView();
        const input = root()?.querySelector<HTMLInputElement>(".clube-archive-search input");
        input?.focus();
        if (input) input.setSelectionRange(input.value.length, input.value.length);
      });

      view.querySelectorAll<HTMLButtonElement>("[data-restore-subscription]").forEach((button) => button.addEventListener("click", async () => {
        const id = Number(button.dataset.restoreSubscription || 0);
        button.disabled = true;
        button.textContent = "Restaurando...";
        try {
          await archiveRequest("restore", id);
          feedback = "Assinante restaurado para a lista principal.";
          await loadArchived();
          root()?.querySelector<HTMLButtonElement>(".clube-admin-refresh")?.click();
        } catch (error) {
          feedback = error instanceof Error ? error.message : "Não foi possível restaurar.";
          renderArchiveView();
        }
      }));
    }

    function injectArchiveAction() {
      const host = root();
      if (!host || archiveMode) return;
      const drawer = host.querySelector<HTMLElement>(".clube-admin-drawer");
      if (!drawer || drawer.querySelector("[data-archive-current]")) return;
      const status = drawer.querySelector<HTMLElement>(".clube-admin-status")?.textContent?.trim() || "";
      if (!status || status.toLowerCase() === "ativa") return;
      const id = Number(drawer.querySelector<HTMLElement>("[data-sync-member]")?.dataset.syncMember || 0);
      if (!id) return;

      const section = document.createElement("section");
      section.className = "clube-admin-drawer-section clube-admin-archive-action";
      section.innerHTML = `<small>ORGANIZAÇÃO</small><p>Este assinante não está ativo. Você pode arquivá-lo sem apagar o histórico e voltar a encontrá-lo depois para remarketing.</p><button type="button" data-archive-current="${id}">Arquivar assinante</button>`;
      const safeNote = drawer.querySelector(".clube-admin-safe-note");
      if (safeNote) safeNote.insertAdjacentElement("beforebegin", section);
      else drawer.appendChild(section);

      section.querySelector<HTMLButtonElement>("[data-archive-current]")?.addEventListener("click", async (event) => {
        const button = event.currentTarget as HTMLButtonElement;
        const confirmed = window.confirm("Arquivar este assinante? Ele sairá da lista principal, mas continuará disponível em Arquivados para consulta e remarketing.");
        if (!confirmed) return;
        button.disabled = true;
        button.textContent = "Arquivando...";
        try {
          await archiveRequest("archive", id);
          feedback = "Assinante arquivado. Ele continua disponível na aba Arquivados.";
          drawer.querySelector<HTMLElement>("[data-close-drawer]")?.click();
          await loadArchived();
          root()?.querySelector<HTMLButtonElement>(".clube-admin-refresh")?.click();
        } catch (error) {
          button.disabled = false;
          button.textContent = "Arquivar assinante";
          window.alert(error instanceof Error ? error.message : "Não foi possível arquivar este assinante.");
        }
      });
    }

    function scan() {
      scanScheduled = false;
      if (destroyed) return;
      const host = root();
      if (!host) return;
      renderArchiveTab();
      if (!loaded && !loading) void loadArchived();
      if (archiveMode) {
        if (!host.querySelector(".clube-admin-archive-view")) renderArchiveView();
      } else {
        injectArchiveAction();
      }
    }

    function scheduleScan() {
      if (destroyed || scanScheduled) return;
      scanScheduled = true;
      window.requestAnimationFrame(scan);
    }

    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.body, { childList: true, subtree: true });
    scheduleScan();

    return () => {
      destroyed = true;
      observer.disconnect();
      document.querySelector(".clube-admin-archive-view")?.remove();
    };
  }, []);

  return null;
}
