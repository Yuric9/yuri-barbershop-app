"use client";

import { useState } from "react";
import { api } from "../../../lib/client/api";
import { REFRESH } from "../../../lib/client/refresh";
import { useServices } from "../../../lib/client/resources";
import type { Service } from "../../../lib/client/types";
import { useAction } from "../../../lib/client/use-action";
import { centsToInput, formatMoney } from "../../../lib/domain/money";
import { Button } from "../../ui/button";
import { AsyncContent, EmptyState } from "../../ui/feedback";
import { CheckboxField, TextField } from "../../ui/field";
import { Badge, PageHeader } from "../../ui/layout";
import { Modal } from "../../ui/modal";

export default function ServicesSection() {
  const services = useServices();
  const [editing, setEditing] = useState<Service | "new" | null>(null);
  const { busy, run } = useAction();

  const toggle = (service: Service) =>
    run(() => api(`/api/services/${service.id}`, { method: "PATCH", body: { active: !service.active } }), {
      success: service.active ? "Serviço desativado." : "Serviço ativado.",
      refresh: REFRESH.services,
    });

  return (
    <>
      <PageHeader
        eyebrow="Cadastros"
        title="Serviços"
        description="Preços e durações usados na agenda, no caixa e nas comissões."
        primary={{ label: "Novo serviço", icon: "plus", onClick: () => setEditing("new") }}
      />
      <AsyncContent {...services} onRetry={services.reload}>
        {({ services: rows }) =>
          rows.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Serviço</th>
                    <th className="table__number">Preço</th>
                    <th className="table__number">Duração</th>
                    <th>Situação</th>
                    <th><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((service) => (
                    <tr key={service.id} className={service.active ? "" : "is-muted"}>
                      <td data-label="Serviço"><strong>{service.name}</strong></td>
                      <td data-label="Preço" className="table__number">{formatMoney(service.priceCents)}</td>
                      <td data-label="Duração" className="table__number">{service.durationMin} min</td>
                      <td data-label="Situação">
                        <Badge tone={service.active ? "success" : "neutral"}>{service.active ? "Ativo" : "Inativo"}</Badge>
                      </td>
                      <td className="table__actions">
                        <Button variant="ghost" size="sm" icon="edit" onClick={() => setEditing(service)}>
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm" disabled={busy} onClick={() => toggle(service)}>
                          {service.active ? "Desativar" : "Ativar"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon="scissors" title="Nenhum serviço cadastrado" />
          )
        }
      </AsyncContent>
      {editing && <ServiceModal key={editing === "new" ? "new" : editing.id} service={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function ServiceModal({ service, onClose }: { service: Service | null; onClose: () => void }) {
  const { busy, run } = useAction();
  const [form, setForm] = useState({
    name: service?.name ?? "",
    price: service ? centsToInput(service.priceCents) : "",
    durationMin: String(service?.durationMin ?? 30),
    active: service?.active ?? true,
  });

  async function submit() {
    const body = { ...form, durationMin: Number(form.durationMin) };
    const done = await run(
      () => (service ? api(`/api/services/${service.id}`, { method: "PATCH", body }) : api("/api/services", { method: "POST", body })),
      { success: "Serviço salvo.", refresh: REFRESH.services },
    );
    if (done) onClose();
  }

  return (
    <Modal
      open
      title={service ? "Editar serviço" : "Novo serviço"}
      description={service ? "Alterações de preço não mudam atendimentos já registrados." : undefined}
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
        <TextField label="Preço (R$)" inputMode="decimal" required value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
        <TextField label="Duração (minutos)" type="number" min={5} step={5} required value={form.durationMin} onChange={(event) => setForm({ ...form, durationMin: event.target.value })} />
        <CheckboxField className="form-grid__full" label="Disponível para agendamento" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
      </div>
    </Modal>
  );
}
