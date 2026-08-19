"use client";

import { useEffect } from "react";

function normalize(value: string | null | undefined) {
  return String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
}

function isActualBarberPortal() {
  const sidebar = document.querySelector<HTMLElement>(".sidebar");
  if (!sidebar) return false;
  const text = normalize(sidebar.textContent);
  return text.includes("barbeiro colaborador") || (text.includes("meu painel") && text.includes("meus ganhos") && text.includes("minha agenda"));
}

function isAdminPreview() {
  return Boolean(document.querySelector(".barber-preview-shell"));
}

function selectedPreviewCollaboratorId() {
  const select = document.querySelector<HTMLSelectElement>(".barber-preview-header-actions select");
  return Number(select?.value || 0);
}

function buildModal() {
  const backdrop = document.createElement("div");
  backdrop.className = "barber-manual-backdrop";
  backdrop.innerHTML = `
    <div class="barber-manual-modal" role="dialog" aria-modal="true" aria-labelledby="barber-manual-title">
      <button type="button" class="barber-manual-close" aria-label="Fechar">×</button>
      <small>LANÇAMENTO RÁPIDO</small>
      <h2 id="barber-manual-title">Adicionar serviço realizado</h2>
      <p>Use quando o cliente foi atendido sem agendamento. O lançamento entra no Caixa como <b>manual • sem agendamento</b>.</p>
      <label>Serviço<select class="barber-manual-service"><option value="">Carregando serviços...</option></select></label>
      <label>Cliente (opcional)<input class="barber-manual-client" maxlength="120" placeholder="Ex.: João ou Cliente avulso" /></label>
      <label>Forma de pagamento<select class="barber-manual-payment"><option>Dinheiro</option><option>Pix</option><option>Cartão de débito</option><option>Cartão de crédito</option><option>Cortesia</option></select></label>
      <label>Observação (opcional)<input class="barber-manual-note" maxlength="240" placeholder="Ex.: atendimento sem horário marcado" /></label>
      <div class="barber-manual-warning">Será registrado como atendimento finalizado de hoje e identificado como lançamento manual.</div>
      <p class="barber-manual-status" role="status"></p>
      <button type="button" class="barber-manual-save">Registrar serviço realizado</button>
    </div>`;
  document.body.appendChild(backdrop);

  const close = () => backdrop.remove();
  backdrop.querySelector<HTMLButtonElement>(".barber-manual-close")?.addEventListener("click", close);
  backdrop.addEventListener("click", (event) => { if (event.target === backdrop) close(); });

  const serviceSelect = backdrop.querySelector<HTMLSelectElement>(".barber-manual-service")!;
  const status = backdrop.querySelector<HTMLElement>(".barber-manual-status")!;
  const save = backdrop.querySelector<HTMLButtonElement>(".barber-manual-save")!;

  fetch("/api/data", { cache: "no-store" })
    .then((response) => response.ok ? response.json() : Promise.reject())
    .then((data) => {
      const services = (data.services || []).filter((item: any) => item.active !== false);
      serviceSelect.innerHTML = '<option value="">Selecione o serviço</option>' + services.map((item: any) => `<option value="${item.id}">${item.name} — ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((item.priceCents || 0) / 100)}</option>`).join("");
    })
    .catch(() => { serviceSelect.innerHTML = '<option value="">Não foi possível carregar</option>'; });

  save.addEventListener("click", async () => {
    const serviceId = Number(serviceSelect.value || 0);
    if (!serviceId) { status.textContent = "Escolha um serviço."; return; }

    const preview = isAdminPreview();
    if (preview && !window.confirm("Este lançamento será REAL e entrará no Caixa do colaborador selecionado. Deseja continuar?")) return;

    save.disabled = true;
    save.textContent = "Registrando...";
    status.textContent = "";
    try {
      const response = await fetch("/api/barber/manual-service", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serviceId,
          clientName: backdrop.querySelector<HTMLInputElement>(".barber-manual-client")?.value || "",
          paymentMethod: backdrop.querySelector<HTMLSelectElement>(".barber-manual-payment")?.value || "Dinheiro",
          note: backdrop.querySelector<HTMLInputElement>(".barber-manual-note")?.value || "",
          collaboratorId: preview ? selectedPreviewCollaboratorId() : undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível registrar o serviço.");
      status.textContent = "Serviço registrado com sucesso como lançamento manual.";
      save.textContent = "Registrado ✓";
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error: any) {
      status.textContent = error?.message || "Não foi possível registrar o serviço.";
      save.disabled = false;
      save.textContent = "Registrar serviço realizado";
    }
  });
}

function ensureButton() {
  const activePreview = isAdminPreview();
  const activeBarber = isActualBarberPortal();
  const existing = document.querySelector<HTMLButtonElement>(".barber-manual-launch");
  if (!activePreview && !activeBarber) { existing?.remove(); return; }

  if (existing) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "barber-manual-launch";
  button.innerHTML = '<span>＋</span><strong>Lançar serviço realizado</strong><small>Sem agendamento</small>';
  button.addEventListener("click", buildModal);

  if (activePreview) {
    const header = document.querySelector<HTMLElement>(".barber-preview-content > header");
    header?.insertAdjacentElement("afterend", button);
  } else {
    const content = document.querySelector<HTMLElement>(".app-content");
    const banner = content?.querySelector<HTMLElement>(".barber-role-banner");
    (banner || content?.querySelector(".app-header"))?.insertAdjacentElement("afterend", button);
  }
}

export default function BarberManualServiceEnhancer() {
  useEffect(() => {
    let scheduled = false;
    const scan = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => { scheduled = false; ensureButton(); });
    };
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    scan();
    return () => {
      observer.disconnect();
      document.querySelector(".barber-manual-launch")?.remove();
      document.querySelector(".barber-manual-backdrop")?.remove();
    };
  }, []);
  return null;
}
