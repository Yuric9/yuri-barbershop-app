"use client";

import { useState } from "react";
import { api } from "../../lib/client/api";
import { REFRESH } from "../../lib/client/refresh";
import type { Transaction } from "../../lib/client/types";
import { useAction } from "../../lib/client/use-action";
import { addDays, formatDate, formatWeekdayShort, todayKey } from "../../lib/domain/dates";
import { isIncome, totals } from "../../lib/domain/finance";
import { formatMoney } from "../../lib/domain/money";
import { IconButton } from "../ui/button";
import { EmptyState } from "../ui/feedback";
import { useFeedback } from "../ui/feedback-provider";

type Props = {
  transactions: Transaction[];
  empty: string;
  /** Quantos dias mostrar antes do botão "Ver mais" (padrão: todos). */
  pageDays?: number;
  /** Esconde o cabeçalho do dia (lista de um dia só). */
  hideDays?: boolean;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
};

function dayLabel(date: string, today: string) {
  if (date === today) return "Hoje";
  if (date === addDays(today, -1)) return "Ontem";
  return `${formatWeekdayShort(date)}, ${formatDate(date).slice(0, 5)}`;
}

/** Lançamentos em linhas compactas, agrupados por dia com o total de cada dia. */
export function EntryList({ transactions, empty, pageDays, hideDays = false, onEdit, onDelete }: Props) {
  const [visibleDays, setVisibleDays] = useState(pageDays ?? Infinity);
  if (!transactions.length) return hideDays ? <p className="muted">{empty}</p> : <EmptyState icon="cash" title={empty} />;

  const today = todayKey();
  const days = new Map<string, Transaction[]>();
  for (const item of [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)) {
    days.set(item.date, [...(days.get(item.date) ?? []), item]);
  }
  const groups = [...days.entries()];

  return (
    <div className="entry-days">
      {groups.slice(0, visibleDays).map(([date, rows]) => {
        const day = totals(rows);
        return (
          <section key={date} className="entry-day">
            {!hideDays && (
              <header className="entry-day__header">
                <span className="capitalize">{dayLabel(date, today)}</span>
                <span>
                  {formatMoney(day.income)}
                  {day.expenses > 0 && <span className="is-negative"> · −{formatMoney(day.expenses)}</span>}
                </span>
              </header>
            )}
            <ul className="entry-list">
              {rows.map((item) => {
                const income = isIncome(item);
                const meta = income ? item.paymentMethod : item.category && item.category !== item.description ? item.category : "Gasto";
                return (
                  <li key={item.id} className="entry">
                    <button type="button" className="entry__main" disabled={!onEdit} onClick={() => onEdit?.(item)}>
                      <span className="entry__name">{item.description}</span>
                      {meta && <span className="entry__meta">{meta}</span>}
                    </button>
                    <strong className={`entry__amount ${income ? "" : "is-negative"}`}>
                      {income ? "" : "−"}
                      {formatMoney(item.amountCents)}
                    </strong>
                    {onDelete && !item.appointmentId && (
                      <IconButton icon="trash" className="entry__delete" label={`Excluir ${item.description}`} onClick={() => onDelete(item)} />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {groups.length > visibleDays && (
        <button type="button" className="link-button entry-days__more" onClick={() => setVisibleDays(visibleDays + (pageDays ?? 7))}>
          Ver mais dias
        </button>
      )}
    </div>
  );
}

/** Exclui um lançamento depois de confirmar. */
export function useDeleteEntry() {
  const feedback = useFeedback();
  const { run } = useAction();
  return async (transaction: Transaction) => {
    const confirmed = await feedback.confirm({
      title: "Excluir lançamento?",
      message: `“${transaction.description}” (${formatMoney(transaction.amountCents)}) será removido do caixa.`,
      confirmLabel: "Excluir",
      danger: true,
    });
    if (confirmed) await run(() => api(`/api/transactions/${transaction.id}`, { method: "DELETE" }), { success: "Lançamento excluído.", refresh: REFRESH.finance });
  };
}
