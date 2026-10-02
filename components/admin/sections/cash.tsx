"use client";

import { useState } from "react";
import { api, useApi } from "../../../lib/client/api";
import { useClients, useCollaborators, useServices } from "../../../lib/client/resources";
import type { Transaction } from "../../../lib/client/types";
import { REFRESH } from "../../../lib/client/refresh";
import { useAction } from "../../../lib/client/use-action";
import { PAYMENT_METHODS } from "../../../lib/domain/catalog";
import { formatDate, todayKey } from "../../../lib/domain/dates";
import { inPeriod, totals } from "../../../lib/domain/finance";
import { centsToInput, formatMoney } from "../../../lib/domain/money";
import { ClientPicker } from "../client-picker";
import { TransactionTable } from "../transaction-table";
import { Button } from "../../ui/button";
import { AsyncContent, LoadingState } from "../../ui/feedback";
import { SelectField, TextAreaField, TextField } from "../../ui/field";
import { Metric, MetricGrid, PageHeader, Panel, Tabs } from "../../ui/layout";
import { Modal } from "../../ui/modal";

export default function CashSection() {
  const today = todayKey();
  const year = today.slice(0, 4);
  const ledger = useApi<{ transactions: Transaction[] }>(`/api/transactions?year=${year}`);
  const [modal, setModal] = useState<"entry" | "walk-in" | null>(null);

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Caixa"
        description="Os lançamentos do caixa ficam sempre na data de hoje. Para dias anteriores, use Relatórios."
        actions={
          <Button variant="secondary" icon="scissors" onClick={() => setModal("walk-in")}>
            Atendimento avulso
          </Button>
        }
        primary={{ label: "Nova movimentação", icon: "plus", onClick: () => setModal("entry") }}
      />

      <AsyncContent {...ledger} onRetry={ledger.reload}>
        {({ transactions }) => {
          const todayRows = inPeriod(transactions, today);
          const todayTotals = totals(todayRows);
          const month = totals(inPeriod(transactions, today.slice(0, 7)));
          const yearTotals = totals(transactions);
          return (
            <div className="stack">
              <MetricGrid>
                <Metric highlight label="Entradas hoje" value={formatMoney(todayTotals.income)} hint={`Saídas hoje: ${formatMoney(todayTotals.expenses)}`} />
                <Metric label="Entradas do mês" value={formatMoney(month.income)} hint={`Saídas: ${formatMoney(month.expenses)}`} />
                <Metric label="Saldo do mês" value={formatMoney(month.balance)} hint="Entradas − saídas" />
                <Metric label={`Saldo de ${year}`} value={formatMoney(yearTotals.balance)} hint="Resultado do ano" />
              </MetricGrid>

              <Panel eyebrow={formatDate(today)} title="Movimentações de hoje">
                <TransactionTable transactions={todayRows} empty="Nenhuma movimentação hoje." />
              </Panel>

              <Panel eyebrow="Histórico" title="Últimas movimentações">
                <TransactionTable transactions={transactions.slice(0, 30)} empty="Nenhuma movimentação registrada neste ano." showDate />
              </Panel>
            </div>
          );
        }}
      </AsyncContent>

      {modal === "entry" && <EntryModal onClose={() => setModal(null)} />}
      {modal === "walk-in" && <WalkInModal onClose={() => setModal(null)} />}
    </>
  );
}

function EntryModal({ onClose }: { onClose: () => void }) {
  const services = useServices();
  const clients = useClients();
  const { busy, run } = useAction();
  const [form, setForm] = useState({ kind: "entrada", amount: "", description: "", clientEmail: "", serviceId: "", paymentMethod: "Pix" });
  const income = form.kind === "entrada";

  function chooseService(serviceId: string) {
    const service = services.data?.services.find((item) => String(item.id) === serviceId);
    setForm({ ...form, serviceId, amount: service ? centsToInput(service.priceCents) : form.amount });
  }

  async function submit() {
    const done = await run(
      () =>
        api("/api/transactions", {
          method: "POST",
          body: {
            kind: form.kind,
            amount: form.amount,
            description: form.description,
            clientEmail: income ? form.clientEmail : "",
            serviceId: income && form.serviceId ? Number(form.serviceId) : null,
            paymentMethod: income ? form.paymentMethod : "",
          },
        }),
      { success: "Movimentação registrada.", refresh: REFRESH.finance },
    );
    if (done) onClose();
  }

  return (
    <Modal
      open
      title="Nova movimentação"
      description={`Lançamento na data de hoje (${formatDate(todayKey())}).`}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy}>
            Registrar
          </Button>
        </>
      }
    >
      <div className="form-sections">
        <Tabs
          label="Tipo"
          value={form.kind}
          onChange={(kind) => setForm({ ...form, kind })}
          items={[
            { value: "entrada", label: "Entrada" },
            { value: "despesa", label: "Saída / despesa" },
          ]}
        />
        {income && (
          <>
            {services.loading || clients.loading ? (
              <LoadingState />
            ) : (
              <div className="form-grid">
                <SelectField label="Serviço (opcional)" value={form.serviceId} onChange={(event) => chooseService(event.target.value)}>
                  <option value="">Sem serviço vinculado</option>
                  {(services.data?.services ?? []).filter((item) => item.active).map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} — {formatMoney(service.priceCents)}
                    </option>
                  ))}
                </SelectField>
                <ClientPicker label="Cliente (opcional)" emptyLabel="Sem cliente vinculado" clients={clients.data?.clients ?? []} value={form.clientEmail} onChange={(clientEmail) => setForm({ ...form, clientEmail })} />
              </div>
            )}
          </>
        )}
        <div className="form-grid">
          <TextField label="Valor (R$)" inputMode="decimal" placeholder="0,00" required value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
          {income && (
            <SelectField label="Forma de pagamento" value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}>
              {PAYMENT_METHODS.map((method) => (
                <option key={method}>{method}</option>
              ))}
            </SelectField>
          )}
        </div>
        <TextAreaField
          label={income ? "Descrição (opcional)" : "Descrição"}
          required={!income}
          placeholder={income ? "Ex.: venda avulsa" : "Ex.: aluguel, energia, produtos"}
          maxLength={240}
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
      </div>
    </Modal>
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
