"use client";

import { useState } from "react";
import { api, useApi } from "../../lib/client/api";
import { REFRESH } from "../../lib/client/refresh";
import type { RecurringExpense } from "../../lib/client/types";
import { useAction } from "../../lib/client/use-action";
import { EXPENSE_CATEGORIES } from "../../lib/domain/catalog";
import { todayKey } from "../../lib/domain/dates";
import { formatMoney } from "../../lib/domain/money";
import { Button } from "../ui/button";
import { AsyncContent, EmptyState } from "../ui/feedback";
import { useFeedback } from "../ui/feedback-provider";
import { SelectField, TextField } from "../ui/field";
import { Badge, Panel } from "../ui/layout";
import { Modal } from "../ui/modal";

/** Valor em centavos → texto para o campo ("720,00"). */
function toInputValue(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function CategoryChips({ value, onChange }: { value: string; onChange: (category: string) => void }) {
  return (
    <div className="field">
      <span className="field__label">Categoria</span>
      <div className="chip-row" role="radiogroup" aria-label="Categoria do gasto">
        {EXPENSE_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            role="radio"
            aria-checked={value === category}
            className={`chip ${value === category ? "is-selected" : ""}`}
            onClick={() => onChange(value === category ? "" : category)}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Registrar um gasto. A data pode ser de dias anteriores, para lançar gastos
 * que ficaram esquecidos.
 */
export function ExpenseModal({ onClose }: { onClose: () => void }) {
  const { busy, run } = useAction();
  const today = todayKey();
  const [form, setForm] = useState({ amount: "", category: "", description: "", date: today });

  async function submit() {
    const done = await run(
      () =>
        api("/api/transactions", {
          method: "POST",
          body: { kind: "despesa", amount: form.amount, category: form.category, description: form.description || form.category, date: form.date },
        }),
      { success: "Gasto registrado.", refresh: REFRESH.finance },
    );
    if (done) onClose();
  }

  return (
    <Modal
      open
      title="Registrar gasto"
      description="Pode lançar gastos de dias anteriores também."
      onClose={onClose}
      onSubmit={submit}
      footer={
        <Button type="submit" className="button--block" loading={busy} disabled={!form.amount || (!form.category && !form.description.trim())}>
          Registrar gasto
        </Button>
      }
    >
      <div className="form-sections">
        <div className="field">
          <label htmlFor="expense-amount">Valor (R$)</label>
          <input id="expense-amount" className="amount-input" inputMode="decimal" autoComplete="off" placeholder="0,00" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
        </div>
        <CategoryChips value={form.category} onChange={(category) => setForm({ ...form, category })} />
        <div className="form-grid">
          <TextField label="Descrição (opcional)" placeholder="Ex.: lâminas, conta de luz" maxLength={240} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          <TextField label="Data" type="date" max={today} required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
        </div>
      </div>
    </Modal>
  );
}

/** Lista de despesas fixas com a situação do mês e o botão "Lançar". */
export function RecurringExpensesPanel() {
  const recurring = useApi<{ expenses: RecurringExpense[] }>("/api/recurring-expenses");
  const [editing, setEditing] = useState<RecurringExpense | "new" | null>(null);

  return (
    <Panel
      eyebrow="Todo mês"
      title="Despesas fixas"
      actions={
        <Button variant="ghost" size="sm" icon="plus" onClick={() => setEditing("new")}>
          Nova
        </Button>
      }
    >
      <AsyncContent {...recurring} onRetry={recurring.reload}>
        {({ expenses }) =>
          expenses.length ? (
            <ul className="list">
              {expenses.map((expense) => (
                <RecurringRow key={expense.id} expense={expense} onEdit={() => setEditing(expense)} />
              ))}
            </ul>
          ) : (
            <EmptyState icon="calendar" title="Nenhuma despesa fixa">
              Cadastre o aluguel e outras contas do mês para lançar com 1 toque.
            </EmptyState>
          )
        }
      </AsyncContent>
      {editing && <RecurringModal key={editing === "new" ? "new" : editing.id} expense={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </Panel>
  );
}

export function RecurringRow({ expense, onEdit }: { expense: RecurringExpense; onEdit?: () => void }) {
  const { busy, run } = useAction();
  const feedback = useFeedback();

  async function launch() {
    const confirmed = await feedback.confirm({
      title: `Lançar ${expense.description}?`,
      message: `${formatMoney(expense.amountCents)} será registrado como gasto deste mês.`,
      confirmLabel: "Lançar",
    });
    if (confirmed) {
      await run(() => api(`/api/recurring-expenses/${expense.id}/launch`, { method: "POST", body: {} }), {
        success: `${expense.description} lançado.`,
        refresh: REFRESH.finance,
      });
    }
  }

  return (
    <li className="list__item">
      <span className="list__main">
        <strong>{expense.description}</strong>
        <small>
          {formatMoney(expense.amountCents)} · vence dia {expense.dayOfMonth}
          {expense.category ? ` · ${expense.category}` : ""}
        </small>
      </span>
      {expense.launched ? (
        <Badge tone="success">Lançada</Badge>
      ) : (
        <Button size="sm" variant={expense.due ? "primary" : "secondary"} loading={busy} onClick={launch}>
          Lançar
        </Button>
      )}
      {onEdit && (
        <Button variant="ghost" size="sm" icon="edit" aria-label={`Editar ${expense.description}`} onClick={onEdit} />
      )}
    </li>
  );
}

function RecurringModal({ expense, onClose }: { expense: RecurringExpense | null; onClose: () => void }) {
  const { busy, run } = useAction();
  const feedback = useFeedback();
  const [form, setForm] = useState({
    description: expense?.description ?? "",
    amount: expense ? toInputValue(expense.amountCents) : "",
    category: expense?.category ?? "",
    dayOfMonth: String(expense?.dayOfMonth ?? 5),
  });

  async function submit() {
    const body = { ...form, dayOfMonth: Number(form.dayOfMonth) };
    const done = await run(
      () => (expense ? api(`/api/recurring-expenses/${expense.id}`, { method: "PATCH", body }) : api("/api/recurring-expenses", { method: "POST", body })),
      { success: "Despesa fixa salva.", refresh: REFRESH.finance },
    );
    if (done) onClose();
  }

  async function stop() {
    if (!expense) return;
    const confirmed = await feedback.confirm({
      title: `Parar de repetir ${expense.description}?`,
      message: "Os lançamentos já feitos continuam no caixa. Ela só deixa de aparecer nos próximos meses.",
      confirmLabel: "Parar de repetir",
      danger: true,
    });
    if (!confirmed) return;
    const done = await run(() => api(`/api/recurring-expenses/${expense.id}`, { method: "PATCH", body: { active: false } }), {
      success: "Despesa fixa removida.",
      refresh: REFRESH.finance,
    });
    if (done) onClose();
  }

  return (
    <Modal
      open
      title={expense ? "Editar despesa fixa" : "Nova despesa fixa"}
      description="Ela aparece todo mês como pendente até você lançar."
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          {expense && (
            <Button variant="ghost" onClick={stop}>
              Parar de repetir
            </Button>
          )}
          <Button type="submit" loading={busy}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="form-sections">
        <div className="form-grid">
          <TextField label="Descrição" required placeholder="Ex.: Aluguel" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          <TextField label="Valor (R$)" inputMode="decimal" required value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
          <SelectField label="Vence no dia" value={form.dayOfMonth} onChange={(event) => setForm({ ...form, dayOfMonth: event.target.value })}>
            {Array.from({ length: 31 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1}
              </option>
            ))}
          </SelectField>
        </div>
        <CategoryChips value={form.category} onChange={(category) => setForm({ ...form, category })} />
        {expense?.launched && <p className="muted small">Esta despesa já foi lançada neste mês.</p>}
      </div>
    </Modal>
  );
}
