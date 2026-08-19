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

type ArchivedClientGroup = {
  key: string;
  clientName: string;
  clientEmail: string;
  phone: string;
  records: ArchivedSubscription[];
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

function whatsappUrl(item: Pick<ArchivedSubscription, "phone" | "clientName">) {
  const digits = String(item.phone || "").replace(/\D/g, "");
  if (!digits) return "";
  const phone = digits.startsWith("55") ? digits : `55${digits}`;
  const firstName = item.clientName.trim().split(" ")[0] || "";
  const text = encodeURIComponent(
    `Olá, ${firstName}! Tudo bem? Aqui é da Yuri Barbershop. Estou entrando em contato sobre o Clube Yuri. Se quiser, posso te passar as condições para voltar a ser membro.`,
  );
  return `https://wa.me/${phone}?text=${text}`;
}

function groupArchived(items: ArchivedSubscription[]) {
  const groups = new Map<string, ArchivedClientGroup>();
  for (const item of items) {
    const key = item.clientEmail.trim().toLowerCase() || `id:${item.id}`;
    const existing = groups.get(key);
    if (existing) {
      existing.records.push(item);
      if (!existing.phone && item.phone) existing.phone = item.phone;
      continue;
    }
    groups.set(key, {
      key,
      clientName: item.clientName,
      clientEmail: item.clientEmail,
      phone: item.phone,
      records: [item],
    });
  }
  return [...groups.values()]
    .map((group) => ({ ...group, records: [...group.records].sort((a, b) => String(b.archivedAt).localeCompare(String(a.archivedAt))) }))
    .sort((a, b) => String(b.records[0]?.archivedAt || "").localeCompare(String(a.records[0]?.archivedAt || "")));
}

async function archiveRequest(action: "archive" | "restore" | "delete", id: number) {
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

    function clientGroups() {
      return groupArchived(archived);
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
      const count = clientGroups().length;
      const label = `Arquivados${count ? ` (${count})` : ""}`;
      if (button.textContent !== label) button.textContent = label;
      button.classList.toggle("active", archiveMode);
    }

    function historyRow(item: ArchivedSubscription) {
      return `<div class="clube-archive-history-row">
        <div class="clube-archive-history-main">
          <span>${escapeHtml(item.statusAtArchive || item.status)}</span>
          <b>${formatDate(item.startDate)} — ${formatDate(item.endDate)}</b>
          <small>Arquivado em ${formatDateTime(item.archivedAt)}</small>
        </div>
        <div class="clube-archive-history-actions">
          <button type="button" data-restore-subscription="${item.id}">Restaurar</button>
          <button type="button" class="danger" data-delete-subscription="${item.id}">Excluir registro</button>
        </div>
      </div>`;
    }

    function archiveCard(group: ArchivedClientGroup) {
      const latest = group.records[0];
      const wa = whatsappUrl(group);
      const lastVisit = group.records.find((item) => item.lastVisit)?.lastVisit || null;
      const history = group.records.map(historyRow).join("");
      return `<article class="clube-archive-card clube-archive-client-card">
        <div class="clube-archive-card-head">
          <div><strong>${escapeHtml(group.clientName)}</strong><small>${escapeHtml(group.clientEmail)}</small></div>
          <span>${escapeHtml(latest?.statusAtArchive || latest?.status || "Arquivado")}</span>
        </div>
        <div class="clube-archive-meta">
          <span><small>Registros arquivados</small><b>${group.records.length}</b></span>
          <span><small>Último ciclo</small><b>${formatDate(latest?.startDate)} — ${formatDate(latest?.endDate)}</b></span>
          <span><small>Último atendimento</small><b>${lastVisit ? `${formatDate(lastVisit.date)} • ${escapeHtml(lastVisit.serviceName)}` : "—"}</b></span>
        </div>
        <div class="clube-archive-actions">
          ${wa ? `<a href="${wa}" target="_blank" rel="noreferrer">WhatsApp para remarketing</a>` : `<span class="clube-archive-no-phone">Sem telefone cadastrado</span>`}
        </div>
        <details class="clube-archive-history" ${group.records.length > 1 ? "" : "open"}>
          <summary>${group.records.length > 1 ? `Ver histórico (${group.records.length})` : "Gerenciar registro"}</summary>
          <div>${history}</div>
        </details>
      </article>`;
    }

    function bindArchiveActions(view: HTMLElement) {
      view.querySelectorAll<HTMLButtonElement>("[data-restore-subscription]").forEach((button) => button.addEventListener("click", async () => {
        const id = Number(button.dataset.restoreSubscription || 0);
        button.disabled = true;
        button.textContent = "Restaurando...";
        try {
          await archiveRequest("restore", id);
          feedback = "Registro restaurado para a lista principal de Assinantes.";
          await loadArchived();
          root()?.querySelector<HTMLButtonElement>(".clube-admin-refresh")?.click();
        } catch (error) {
          feedback = error instanceof Error ? error.message : "Não foi possível restaurar.";
          renderArchiveView();
        }
      }));

      view.querySelectorAll<HTMLButtonElement>("[data-delete-subscription]").forEach((button) => button.addEventListener("click", async () => {
        const id = Number(button.dataset.deleteSubscription || 0);
        const confirmed = window.confirm(
          "Excluir definitivamente este registro de assinatura? Esta ação remove somente o registro do Clube e seus vínculos de pagamento. O cadastro do cliente e os atendimentos não serão apagados.",
        );
        if (!confirmed) return;
        button.disabled = true;
        button.textContent = "Excluindo...";
        try {
          await archiveRequest("delete", id);
          feedback = "Registro excluído definitivamente. O cadastro do cliente foi preservado.";
          await loadArchived();
          root()?.querySelector<HTMLButtonElement>(".clube-admin-refresh")?.click();
        } catch (error) {
          feedback = error instanceof Error ? error.message : "Não foi possível excluir este registro.";
          renderArchiveView();
        }
      }));
    }

    function renderArchiveView() {
      const host = root();
      if (!host || !archiveMode) return;
      host.classList.add("clube-admin-show-archive");
      host.querySelector(".clube-admin-archive-view")?.remove();
      const body = host.querySelector<HTMLElement>(".clube-admin-body");
      if (!body) return;
      const term = search.trim().toLowerCase();
      const groups = clientGroups();
      const rows = groups.filter((group) => !term || `${group.clientName} ${group.clientEmail} ${group.phone}`.toLowerCase().includes(term));
      const view = document.createElement("div");
      view.className = "clube-admin-archive-view";
      view.innerHTML = `
        <div class="clube-archive-heading">
          <div><small>BASE PARA RELACIONAMENTO</small><h3>Ex-assinantes arquivados</h3><p>Cada cliente aparece uma única vez. O histórico completo continua disponível para consulta, remarketing ou limpeza de registros de teste.</p></div>
          <span>${groups.length} cliente(s) • ${archived.length} registro(s)</span>
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

      bindArchiveActions(view);
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
