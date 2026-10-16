"use client";

import { useState } from "react";
import { useApi } from "../../../lib/client/api";
import type { Dashboard } from "../../../lib/client/types";
import { MONTH_NAMES } from "../../../lib/domain/dates";
import { percentChange } from "../../../lib/domain/finance";
import { formatMoney } from "../../../lib/domain/money";
import { plural } from "../../../lib/domain/text";
import type { SectionProps } from "../admin-app";
import { EntryList, useDeleteEntry } from "../entry-list";
import { ExpenseModal, RecurringRow } from "../expenses";
import { QuickEntry } from "../quick-entry";
import { Button } from "../../ui/button";
import { AsyncContent } from "../../ui/feedback";
import { Panel } from "../../ui/layout";

/** Sem lançar gastos há tantos dias, a tela inicial lembra. */
const EXPENSE_REMINDER_DAYS = 7;

/** "↑ 12%" / "↓ 5%" comparando com o mesmo período do mês anterior. */
function Trend({ current, previous, monthName }: { current: number; previous: number; monthName: string }) {
  const change = percentChange(current, previous);
  if (change === null) return null;
  const arrow = change > 0 ? "↑" : change < 0 ? "↓" : "=";
  return (
    <span className={change > 0 ? "trend trend--up" : change < 0 ? "trend trend--down" : "trend"} title={`Comparado com o mesmo período de ${monthName}`}>
      {arrow} {Math.abs(change)}%
    </span>
  );
}

export default function DashboardSection({ navigate }: SectionProps) {
  const dashboard = useApi<Dashboard>("/api/dashboard");
  const remove = useDeleteEntry();
  const [expenseOpen, setExpenseOpen] = useState(false);

  return (
    <>
      <AsyncContent {...dashboard} onRetry={dashboard.reload}>
        {(data) => {
          const monthIndex = Number(data.today.slice(5, 7)) - 1;
          const previousMonthName = MONTH_NAMES[(monthIndex + 11) % 12].toLowerCase();
          const forgotExpenses = data.daysSinceLastExpense === null || data.daysSinceLastExpense >= EXPENSE_REMINDER_DAYS;
          const dueRecurring = data.recurring.filter((item) => item.due);

          return (
            <div className="stack">
              <section className="today-card" aria-label="Resumo de hoje">
                <span className="today-card__label">Hoje</span>
                <strong className="today-card__value">{formatMoney(data.day.income)}</strong>
                <span className="today-card__hint">{plural(data.day.services, "atendimento", "atendimentos")}</span>
                <dl className="today-card__stats">
                  <div>
                    <dt>Semana</dt>
                    <dd>{formatMoney(data.week.income)}</dd>
                  </div>
                  <div>
                    <dt>{MONTH_NAMES[monthIndex]}</dt>
                    <dd>
                      {formatMoney(data.month.income)} <Trend current={data.month.income} previous={data.previousMonth.income} monthName={previousMonthName} />
                    </dd>
                  </div>
                  <div>
                    <dt>Saldo do mês</dt>
                    <dd className={data.monthTotals.balance < 0 ? "is-negative" : ""}>{formatMoney(data.monthTotals.balance)}</dd>
                  </div>
                </dl>
              </section>

              {dueRecurring.length > 0 && (
                <ul className="entry-list notice-list">
                  {dueRecurring.map((expense) => (
                    <RecurringRow key={expense.id} expense={expense} />
                  ))}
                </ul>
              )}

              {forgotExpenses && (
                <p className="notice">
                  {data.daysSinceLastExpense === null
                    ? "Nenhum gasto lançado ainda."
                    : `Sem gastos lançados há ${plural(data.daysSinceLastExpense, "dia", "dias")}.`}{" "}
                  <button type="button" className="link-button" onClick={() => setExpenseOpen(true)}>
                    Lançar gasto
                  </button>
                </p>
              )}

              {data.pendingOrders > 0 && (
                <p className="notice">
                  {plural(data.pendingOrders, "pedido", "pedidos")} de produtos aguardando.{" "}
                  <button type="button" className="link-button" onClick={() => navigate("produtos")}>
                    Ver pedidos
                  </button>
                </p>
              )}

              <Panel title="Lançar atendimento">
                <QuickEntry
                  extra={
                    <Button variant="secondary" icon="minus" onClick={() => setExpenseOpen(true)}>
                      Gasto
                    </Button>
                  }
                />
              </Panel>

              <Panel title="Lançamentos de hoje">
                <EntryList hideDays transactions={data.todayEntries} empty="Nenhum lançamento hoje." onDelete={remove} />
              </Panel>
            </div>
          );
        }}
      </AsyncContent>

      {expenseOpen && <ExpenseModal onClose={() => setExpenseOpen(false)} />}
    </>
  );
}
