"use client";

import { useState } from "react";
import { api } from "../../../lib/client/api";
import { REFRESH } from "../../../lib/client/refresh";
import { useCollaborators, useServices } from "../../../lib/client/resources";
import type { Collaborator } from "../../../lib/client/types";
import { useAction } from "../../../lib/client/use-action";
import { formatMoney } from "../../../lib/domain/money";
import { Button } from "../../ui/button";
import { AsyncContent, EmptyState, LoadingState } from "../../ui/feedback";
import { CheckboxField, TextField } from "../../ui/field";
import { Avatar, Badge, PageHeader } from "../../ui/layout";
import { Modal } from "../../ui/modal";

export default function TeamSection() {
  const collaborators = useCollaborators();
  const [editing, setEditing] = useState<Collaborator | "new" | null>(null);
  const [commissions, setCommissions] = useState<Collaborator | null>(null);

  return (
    <>
      <PageHeader
        eyebrow="Cadastros"
        title="Equipe"
        description="Barbeiros, percentuais de comissão e ganhos do mês. A comissão é calculada quando o atendimento é finalizado."
        primary={{ label: "Novo colaborador", icon: "plus", onClick: () => setEditing("new") }}
      />
      <AsyncContent {...collaborators} onRetry={collaborators.reload}>
        {({ collaborators: rows }) =>
          rows.length ? (
            <div className="card-grid">
              {rows.map((item) => (
                <article key={item.id} className={`team-card ${item.active ? "" : "is-muted"}`}>
                  <header>
                    <Avatar name={item.name} size="lg" />
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.phone || item.email}</span>
                    </div>
                    <div className="team-card__badges">
                      {item.owner && <Badge tone="gold">Proprietário</Badge>}
                      {!item.active && <Badge>Inativo</Badge>}
                    </div>
                  </header>
                  <div className="stat-row">
                    <div><span>Comissão padrão</span><strong>{item.defaultCommissionPercent}%</strong></div>
                    <div><span>Atendimentos no mês</span><strong>{item.stats.monthCount}</strong></div>
                    <div><span>Faturado no mês</span><strong>{formatMoney(item.stats.monthRevenueCents)}</strong></div>
                    <div><span>Comissão no mês</span><strong>{formatMoney(item.stats.monthCommissionCents)}</strong></div>
                  </div>
                  <p className="muted small">
                    Total histórico: {item.stats.finalizedCount} atendimento(s) · {formatMoney(item.stats.totalCommissionCents)} em comissões
                    {item.commissions.length > 0 && ` · ${item.commissions.length} serviço(s) com percentual próprio`}
                  </p>
                  <footer>
                    <Button variant="secondary" size="sm" icon="edit" onClick={() => setEditing(item)}>
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setCommissions(item)}>
                      Comissão por serviço
                    </Button>
                  </footer>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState icon="team" title="Nenhum colaborador cadastrado" />
          )
        }
      </AsyncContent>

      {editing && <CollaboratorModal key={editing === "new" ? "new" : editing.id} collaborator={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {commissions && <CommissionModal key={commissions.id} collaborator={commissions} onClose={() => setCommissions(null)} />}
    </>
  );
}

function CollaboratorModal({ collaborator, onClose }: { collaborator: Collaborator | null; onClose: () => void }) {
  const { busy, run } = useAction();
  const [form, setForm] = useState({
    name: collaborator?.name ?? "",
    email: collaborator?.email ?? "",
    phone: collaborator?.phone ?? "",
    defaultCommissionPercent: String(collaborator?.defaultCommissionPercent ?? 40),
    active: collaborator?.active ?? true,
  });

  async function submit() {
    const body = { ...form, defaultCommissionPercent: Number(form.defaultCommissionPercent) };
    const done = await run(
      () => (collaborator ? api(`/api/collaborators/${collaborator.id}`, { method: "PATCH", body }) : api("/api/collaborators", { method: "POST", body })),
      { success: "Colaborador salvo.", refresh: REFRESH.team },
    );
    if (done) onClose();
  }

  return (
    <Modal
      open
      title={collaborator ? "Editar colaborador" : "Novo colaborador"}
      description="Alterar o percentual não muda as comissões de atendimentos já finalizados."
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <TextField className="form-grid__full" label="Nome" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <TextField label="E-mail" type="email" required disabled={collaborator?.owner} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <TextField label="Telefone" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        <TextField label="Comissão padrão (%)" type="number" min={0} max={100} required value={form.defaultCommissionPercent} onChange={(event) => setForm({ ...form, defaultCommissionPercent: event.target.value })} />
        <CheckboxField className="form-grid__full" label="Ativo (aparece na agenda e no caixa)" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
      </div>
    </Modal>
  );
}

function CommissionModal({ collaborator, onClose }: { collaborator: Collaborator; onClose: () => void }) {
  const services = useServices();
  const { busy, run } = useAction();
  const [values, setValues] = useState<Record<number, string>>(() =>
    Object.fromEntries(collaborator.commissions.map((item) => [item.serviceId, String(item.percent)])),
  );

  async function submit() {
    const rows = (services.data?.services ?? []).filter((service) => service.active);
    const changed = rows.filter((service) => {
      const current = collaborator.commissions.find((item) => item.serviceId === service.id);
      return (values[service.id] ?? "") !== (current ? String(current.percent) : "");
    });
    const done = await run(
      async () => {
        for (const service of changed) {
          const value = values[service.id]?.trim() ?? "";
          await api(`/api/collaborators/${collaborator.id}/commissions`, {
            method: "PUT",
            body: { serviceId: service.id, percent: value === "" ? null : Number(value) },
          });
        }
        return true;
      },
      { success: changed.length ? "Comissões atualizadas." : undefined, refresh: REFRESH.team },
    );
    if (done) onClose();
  }

  return (
    <Modal
      open
      title={`Comissões de ${collaborator.name}`}
      description={`Deixe em branco para usar o padrão de ${collaborator.defaultCommissionPercent}%.`}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy}>
            Salvar
          </Button>
        </>
      }
    >
      {services.loading ? (
        <LoadingState />
      ) : (
        <ul className="commission-list">
          {(services.data?.services ?? [])
            .filter((service) => service.active)
            .map((service) => (
              <li key={service.id}>
                <label htmlFor={`commission-${service.id}`}>
                  <strong>{service.name}</strong>
                  <small>{formatMoney(service.priceCents)}</small>
                </label>
                <span className="percent-input">
                  <input
                    id={`commission-${service.id}`}
                    type="number"
                    min={0}
                    max={100}
                    placeholder={String(collaborator.defaultCommissionPercent)}
                    value={values[service.id] ?? ""}
                    onChange={(event) => setValues({ ...values, [service.id]: event.target.value })}
                  />
                  %
                </span>
              </li>
            ))}
        </ul>
      )}
    </Modal>
  );
}
