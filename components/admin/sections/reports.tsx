"use client";

import { useMemo, useState } from "react";
import { api, useApi } from "../../../lib/client/api";
import { REFRESH } from "../../../lib/client/refresh";
import { useClients, useServices } from "../../../lib/client/resources";
import type { Transaction } from "../../../lib/client/types";
import { useAction } from "../../../lib/client/use-action";
import { MONTH_NAMES, todayKey } from "../../../lib/domain/dates";
import { inPeriod, isIncome, monthlySummaries, totals } from "../../../lib/domain/finance";
import { centsToInput, formatMoney } from "../../../lib/domain/money";
import { BarChart } from "../bar-chart";
import { ClientPicker } from "../client-picker";
import { TransactionTable } from "../transaction-table";
import { Button } from "../../ui/button";
import { AsyncContent, LoadingState } from "../../ui/feedback";
import { useFeedback } from "../../ui/feedback-provider";
import { SelectField, TextField } from "../../ui/field";
import { Metric, MetricGrid, PageHeader, Panel, Tabs } from "../../ui/layout";
import { Modal } from "../../ui/modal";

export default function ReportsSection() {
  const today = todayKey();
  const currentYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(Number(today.slice(5, 7)));
  const [editing, setEditing] = useState<Transaction | "new" | null>(null);
  const ledger = useApi<{ transactions: Transaction[] }>(`/api/transactions?year=${year}`);
  const feedback = useFeedback();
  const { run } = useAction();

  const years = Array.from({ length: 7 }, (_, index) => currentYear - 5 + index);
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

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
        title="Relatórios"
        description="Acompanhe os resultados, registre dias anteriores e corrija lançamentos."
        primary={{ label: "Novo lançamento", icon: "plus", onClick: () => setEditing("new") }}
      />

      <div className="toolbar">
        <div className="filters">
          <SelectField label="Mês" value={month} onChange={(event) => setMonth(Number(event.target.value))}>
            {MONTH_NAMES.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Ano" value={year} onChange={(event) => setYear(Number(event.target.value))}>
            {years.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </SelectField>
        </div>
      </div>

      <AsyncContent {...ledger} onRetry={ledger.reload}>
        {({ transactions }) => (
          <ReportBody
            transactions={transactions}
            year={year}
            month={month}
            monthKey={monthKey}
            onSelectMonth={setMonth}
            onEdit={setEditing}
            onDelete={remove}
          />
        )}
      </AsyncContent>

      {editing && <TransactionModal key={editing === "new" ? "new" : editing.id} transaction={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function ReportBody({
  transactions,
  year,
  month,
  monthKey,
  onSelectMonth,
  onEdit,
  onDelete,
}: {
  transactions: Transaction[];
  year: number;
  month: number;
  monthKey: string;
  onSelectMonth: (month: number) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}) {
  const monthRows = useMemo(() => inPeriod(transactions, monthKey), [transactions, monthKey]);
  const monthTotals = totals(monthRows);
  const yearTotals = totals(transactions);
  const summaries = monthlySummaries(transactions, year);
  const byPayment = useMemo(() => {
    const groups = new Map<string, number>();
    for (const row of monthRows.filter(isIncome)) groups.set(row.paymentMethod || "Não informado", (groups.get(row.paymentMethod || "Não informado") ?? 0) + row.amountCents);
    return [...groups.entries()].sort((a, b) => b[1] - a[1]);
  }, [monthRows]);
  const monthName = MONTH_NAMES[month - 1];

  return (
    <div className="stack">
      <MetricGrid>
        <Metric highlight label={`Faturamento de ${monthName}`} value={formatMoney(monthTotals.income)} hint={`${monthRows.filter(isIncome).length} entrada(s)`} />
        <Metric label="Despesas do mês" value={formatMoney(monthTotals.expenses)} hint="Saídas registradas" />
        <Metric label="Saldo do mês" value={formatMoney(monthTotals.balance)} hint="Entradas − saídas" />
        <Metric label={`Saldo de ${year}`} value={formatMoney(yearTotals.balance)} hint={`${formatMoney(yearTotals.income)} faturados no ano`} />
      </MetricGrid>

      <div className="grid-2 grid-2--wide-first">
        <Panel eyebrow="Visão anual" title={`Faturamento por mês — ${year}`}>
          <BarChart
            label={`Faturamento mensal de ${year}`}
            selected={String(month)}
            onSelect={(key) => onSelectMonth(Number(key))}
            bars={summaries.map((item) => ({ key: String(item.month), label: item.name.slice(0, 3), title: `${item.name} de ${year}`, value: item.income }))}
          />
        </Panel>
        <Panel eyebrow={monthName} title="Entradas por pagamento">
          {byPayment.length ? (
            <ul className="breakdown">
              {byPayment.map(([method, amount]) => (
                <li key={method}>
                  <span>{method}</span>
                  <span className="breakdown__bar">
                    <span style={{ width: `${(amount / Math.max(1, monthTotals.income)) * 100}%` }} />
                  </span>
                  <strong>{formatMoney(amount)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Sem entradas neste mês.</p>
          )}
        </Panel>
      </div>

      <Panel eyebrow="Histórico" title={`Lançamentos de ${monthName}`}>
        <TransactionTable transactions={monthRows} empty="Nenhum lançamento neste mês." showDate onEdit={onEdit} onDelete={onDelete} />
      </Panel>
    </div>
  );
}

function TransactionModal({ transaction, onClose }: { transaction: Transaction | null; onClose: () => void }) {
  const services = useServices();
  const clients = useClients();
  const { busy, run } = useAction();
  const today = todayKey();
  const [mode, setMode] = useState<"day" | "month">("day");
  const [form, setForm] = useState({
    kind: transaction?.kind === "despesa" ? "despesa" : "entrada",
    amount: transaction ? centsToInput(transaction.amountCents) : "",
    date: transaction?.date ?? today,
    month: today.slice(0, 7),
    description: transaction?.description ?? "",
    clientEmail: transaction?.clientEmail ?? "",
    serviceId: transaction?.serviceId ? String(transaction.serviceId) : "",
    paymentMethod: transaction?.paymentMethod ?? "",
  });

  async function submit() {
    const body = {
      kind: form.kind,
      amount: form.amount,
      description: form.description,
      clientEmail: form.clientEmail,
      serviceId: form.serviceId ? Number(form.serviceId) : null,
      paymentMethod: form.paymentMethod,
      ...(mode === "month" && !transaction ? { month: form.month } : { date: form.date }),
    };
    const done = await run(
      () => (transaction ? api(`/api/transactions/${transaction.id}`, { method: "PATCH", body }) : api("/api/transactions", { method: "POST", body })),
      { success: transaction ? "Lançamento atualizado." : "Lançamento registrado.", refresh: REFRESH.finance },
    );
    if (done) onClose();
  }

  return (
    <Modal
      open
      size="lg"
      title={transaction ? "Editar lançamento" : "Novo lançamento"}
      description={transaction?.appointmentId ? "Este lançamento veio de um atendimento da agenda." : "Registre valores de dias anteriores ou o fechamento de um mês."}
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
      {services.loading || clients.loading ? (
        <LoadingState />
      ) : (
        <div className="form-sections">
          {!transaction && (
            <Tabs
              label="Período"
              value={mode}
              onChange={setMode}
              items={[
                { value: "day", label: "Dia específico" },
                { value: "month", label: "Mês fechado" },
              ]}
            />
          )}
          <div className="form-grid">
            <SelectField label="Tipo" value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })}>
              <option value="entrada">Entrada / faturamento</option>
              <option value="despesa">Saída / despesa</option>
            </SelectField>
            {mode === "month" && !transaction ? (
              <TextField label="Mês" type="month" max={today.slice(0, 7)} required value={form.month} onChange={(event) => setForm({ ...form, month: event.target.value })} />
            ) : (
              <TextField label="Data" type="date" max={today} required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            )}
            <TextField label="Valor (R$)" inputMode="decimal" placeholder="0,00" required value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
            <TextField label="Forma de pagamento" placeholder="Pix, dinheiro..." value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })} />
            <SelectField label="Serviço (opcional)" value={form.serviceId} onChange={(event) => setForm({ ...form, serviceId: event.target.value })}>
              <option value="">Sem vínculo</option>
              {(services.data?.services ?? []).map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </SelectField>
            <ClientPicker label="Cliente (opcional)" emptyLabel="Sem vínculo" clients={clients.data?.clients ?? []} value={form.clientEmail} onChange={(clientEmail) => setForm({ ...form, clientEmail })} />
            <TextField
              className="form-grid__full"
              label="Descrição"
              maxLength={240}
              placeholder={mode === "month" ? "Ex.: fechamento consolidado do mês" : "Ex.: serviços realizados no dia"}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
