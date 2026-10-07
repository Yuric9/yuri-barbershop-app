"use client";

import { useState } from "react";
import { api, useApi } from "../../../lib/client/api";
import { useCollaborators, useServices } from "../../../lib/client/resources";
import type { Transaction } from "../../../lib/client/types";
import { REFRESH } from "../../../lib/client/refresh";
import { useAction } from "../../../lib/client/use-action";
import { PAYMENT_METHODS } from "../../../lib/domain/catalog";
import { formatDate, todayKey } from "../../../lib/domain/dates";
import { inPeriod, isServiceEntry, totals } from "../../../lib/domain/finance";
import { formatMoney } from "../../../lib/domain/money";
import { ExpenseModal, RecurringExpensesPanel } from "../expenses";
import { QuickEntry } from "../quick-entry";
import { TransactionTable } from "../transaction-table";
import { Button } from "../../ui/button";
import { AsyncContent, LoadingState } from "../../ui/feedback";
import { useFeedback } from "../../ui/feedback-provider";
import { SelectField, TextField } from "../../ui/field";
import { Metric, MetricGrid, PageHeader, Panel } from "../../ui/layout";
import { Modal } from "../../ui/modal";

export default function CashSection() {
  const today = todayKey();
  const year = today.slice(0, 4);
  const ledger = useApi<{ transactions: Transaction[] }>(`/api/transactions?year=${year}`);
  const collaborators = useCollaborators();
  const feedback = useFeedback();
  const { run } = useAction();
  const [modal, setModal] = useState<"expense" | "walk-in" | null>(null);
  // O atendimento avulso com escolha de profissional só faz sentido com equipe.
  const hasTeam = (collaborators.data?.collaborators ?? []).filter((item) => item.active).length > 1;

  async function remove(transaction: Transaction) {
    const confirmed = await feedback.confirm({
      title: "Excluir lançamento?",
      message: `“${transaction.description}” (${formatMoney(transaction.amountCents)}) será removido do caixa.`,
      confirmLabel: "Excluir",
      danger: true,
    });
    if (confirmed) await run(() => api(`/api/transactions/${transaction.id}`, { method: "DELETE" }), { success: "Lançamento excluído.", refresh: REFRESH.finance });
  }

  return (
    <>
      <PageHeader
        eyebrow="Financeiro"
        title="Caixa"
        description="Atendimentos entram na data de hoje. Gastos podem ser lançados com a data em que aconteceram."
        actions={
          hasTeam ? (
            <Button variant="secondary" icon="scissors" onClick={() => setModal("walk-in")}>
              Atendimento por profissional
            </Button>
          ) : undefined
        }
        primary={{ label: "Registrar gasto", icon: "cash", onClick: () => setModal("expense") }}
      />

      <div className="stack">
        <Panel eyebrow="Toque para lançar" title="Lançamento rápido">
          <QuickEntry />
        </Panel>

        <AsyncContent {...ledger} onRetry={ledger.reload}>
          {({ transactions }) => {
            const todayRows = inPeriod(transactions, today);
            const todayTotals = totals(todayRows);
            const todayServices = todayRows.filter(isServiceEntry).length;
            const month = totals(inPeriod(transactions, today.slice(0, 7)));
            const yearTotals = totals(transactions);
            return (
              <div className="stack">
                <MetricGrid>
                  <Metric highlight label="Entradas hoje" value={formatMoney(todayTotals.income)} hint={`${todayServices} atendimento(s) · gastos ${formatMoney(todayTotals.expenses)}`} />
                  <Metric label="Entradas do mês" value={formatMoney(month.income)} hint={`Gastos: ${formatMoney(month.expenses)}`} />
                  <Metric label="Saldo do mês" value={formatMoney(month.balance)} hint="Entradas − gastos" />
                  <Metric label={`Saldo de ${year}`} value={formatMoney(yearTotals.balance)} hint="Resultado do ano" />
                </MetricGrid>

                <Panel eyebrow={formatDate(today)} title="Lançamentos de hoje">
                  <TransactionTable transactions={todayRows} empty="Nenhum lançamento hoje." onDelete={remove} />
                </Panel>

                <RecurringExpensesPanel />

                <Panel eyebrow="Histórico" title="Últimos lançamentos">
                  <TransactionTable transactions={transactions.slice(0, 30)} empty="Nenhum lançamento registrado neste ano." showDate onDelete={remove} />
                </Panel>
              </div>
            );
          }}
        </AsyncContent>
      </div>

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
