"use client";

import { useState } from "react";
import { api, useApi } from "../../../lib/client/api";
import { useCollaborators, useServices } from "../../../lib/client/resources";
import type { Transaction } from "../../../lib/client/types";
import { REFRESH } from "../../../lib/client/refresh";
import { useAction } from "../../../lib/client/use-action";
import { PAYMENT_METHODS } from "../../../lib/domain/catalog";
import { todayKey } from "../../../lib/domain/dates";
import { inPeriod, totals } from "../../../lib/domain/finance";
import { formatMoney } from "../../../lib/domain/money";
import { ExpenseModal, RecurringExpensesPanel } from "../expenses";
import { EntryList, useDeleteEntry } from "../entry-list";
import { Button } from "../../ui/button";
import { AsyncContent, LoadingState } from "../../ui/feedback";
import { SelectField, TextField } from "../../ui/field";
import { PageHeader, Panel } from "../../ui/layout";
import { Modal } from "../../ui/modal";

export default function CashSection() {
  const today = todayKey();
  const ledger = useApi<{ transactions: Transaction[] }>(`/api/transactions?year=${today.slice(0, 4)}`);
  const collaborators = useCollaborators();
  const remove = useDeleteEntry();
  const [modal, setModal] = useState<"expense" | "walk-in" | null>(null);
  // O atendimento avulso com escolha de profissional só faz sentido com equipe.
  const hasTeam = (collaborators.data?.collaborators ?? []).filter((item) => item.active).length > 1;

  return (
    <>
      <PageHeader
        eyebrow="Financeiro"
        title="Caixa"
        description="Tudo o que entrou e saiu, dia a dia."
        actions={
          <>
            {hasTeam && (
              <Button variant="secondary" icon="scissors" onClick={() => setModal("walk-in")}>
                Por profissional
              </Button>
            )}
            <Button variant="secondary" icon="minus" onClick={() => setModal("expense")}>
              Registrar gasto
            </Button>
          </>
        }
      />

      <AsyncContent {...ledger} onRetry={ledger.reload}>
        {({ transactions }) => {
          const todayTotals = totals(inPeriod(transactions, today));
          const month = totals(inPeriod(transactions, today.slice(0, 7)));
          return (
            <div className="stack">
              <dl className="summary">
                <div>
                  <dt>Hoje</dt>
                  <dd>{formatMoney(todayTotals.income)}</dd>
                </div>
                <div>
                  <dt>Mês</dt>
                  <dd>{formatMoney(month.income)}</dd>
                </div>
                <div>
                  <dt>Saldo do mês</dt>
                  <dd className={month.balance < 0 ? "is-negative" : ""}>{formatMoney(month.balance)}</dd>
                </div>
              </dl>

              <Panel title="Lançamentos">
                <EntryList transactions={transactions} pageDays={7} empty="Nenhum lançamento registrado neste ano." onDelete={remove} />
              </Panel>

              <RecurringExpensesPanel />
            </div>
          );
        }}
      </AsyncContent>

      {modal === "expense" && <ExpenseModal onClose={() => setModal(null)} />}
      {modal === "walk-in" && <WalkInModal onClose={() => setModal(null)} />}
    </>
  );
}

function WalkInModal({ onClose }: { onClose: () => void }) {
  const services = useServices();
  const collaborators = useCollaborators();
  const { busy, run } = useAction();
  const [form, setForm] = useState({ collaboratorId: "", serviceId: "", clientName: "", paymentMethod: "Pix", note: "" });

  const activeServices = (services.data?.services ?? []).filter((item) => item.active);
  const activeCollaborators = (collaborators.data?.collaborators ?? []).filter((item) => item.active);
  const service = activeServices.find((item) => String(item.id) === form.serviceId);

  async function submit() {
    const done = await run(
      () =>
        api("/api/walk-ins", {
          method: "POST",
          body: { ...form, collaboratorId: Number(form.collaboratorId), serviceId: Number(form.serviceId) },
        }),
      { success: "Atendimento avulso registrado no caixa.", refresh: REFRESH.finance },
    );
    if (done) onClose();
  }

  return (
    <Modal
      open
      title="Atendimento avulso"
      description="Cliente atendido sem agendamento. O atendimento já entra como finalizado, com comissão calculada."
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy} disabled={!form.collaboratorId || !form.serviceId}>
            Registrar {service ? formatMoney(service.priceCents) : ""}
          </Button>
        </>
      }
    >
      {services.loading || collaborators.loading ? (
        <LoadingState />
      ) : (
        <div className="form-grid">
          <SelectField label="Profissional" required value={form.collaboratorId} onChange={(event) => setForm({ ...form, collaboratorId: event.target.value })}>
            <option value="">Selecione</option>
            {activeCollaborators.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Serviço" required value={form.serviceId} onChange={(event) => setForm({ ...form, serviceId: event.target.value })}>
            <option value="">Selecione</option>
            {activeServices.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} — {formatMoney(item.priceCents)}
              </option>
            ))}
          </SelectField>
          <TextField label="Nome do cliente (opcional)" value={form.clientName} onChange={(event) => setForm({ ...form, clientName: event.target.value })} />
          <SelectField label="Forma de pagamento" value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}>
            {PAYMENT_METHODS.map((method) => (
              <option key={method}>{method}</option>
            ))}
          </SelectField>
          <TextField className="form-grid__full" label="Observação (opcional)" maxLength={240} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
        </div>
      )}
    </Modal>
  );
}
