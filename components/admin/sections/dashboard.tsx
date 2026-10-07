"use client";

import { useState } from "react";
import { useApi } from "../../../lib/client/api";
import type { Dashboard } from "../../../lib/client/types";
import { formatLongDate, formatWeekdayShort, MONTH_NAMES } from "../../../lib/domain/dates";
import { percentChange } from "../../../lib/domain/finance";
import { formatMoney } from "../../../lib/domain/money";
import type { SectionProps } from "../admin-app";
import { BarChart } from "../bar-chart";
import { ExpenseModal, RecurringRow } from "../expenses";
import { QuickEntry } from "../quick-entry";
import { Button } from "../../ui/button";
import { Alert, AsyncContent } from "../../ui/feedback";
import { Metric, MetricGrid, PageHeader, Panel } from "../../ui/layout";

/** Sem lançar gastos há tantos dias, a tela inicial lembra. */
const EXPENSE_REMINDER_DAYS = 7;

/** Primeiro nome com inicial maiúscula (ex.: "yuri césar" → "Yuri"). */
function firstName(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return first.charAt(0).toLocaleUpperCase("pt-BR") + first.slice(1);
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** "↑ 12% vs set" / "↓ 5% vs set" comparando com o mesmo período do mês anterior. */
function comparison(current: number, previous: number, previousMonthName: string) {
  const change = percentChange(current, previous);
  if (change === null) return undefined;
  const arrow = change > 0 ? "↑" : change < 0 ? "↓" : "=";
  return (
    <span className={change > 0 ? "trend trend--up" : change < 0 ? "trend trend--down" : "trend"}>
      {arrow} {Math.abs(change)}% vs {previousMonthName}
    </span>
  );
}

export default function DashboardSection({ navigate, user }: SectionProps) {
  const dashboard = useApi<Dashboard>("/api/dashboard");
  const [selectedDay, setSelectedDay] = useState("");
  const [expenseOpen, setExpenseOpen] = useState(false);

  return (
    <>
      <PageHeader
        className="page-header--greeting"
        eyebrow="Visão geral"
        title={`Olá, ${firstName(user.name)}!`}
        description="Quanto entrou e quantos atendimentos você fez."
        actions={
          <Button variant="secondary" icon="cash" onClick={() => setExpenseOpen(true)}>
            Registrar gasto
          </Button>
        }
      />

      <AsyncContent {...dashboard} onRetry={dashboard.reload}>
        {(data) => {
          const day = data.lastSevenDays.find((item) => item.date === selectedDay);
          const previousMonthName = MONTH_NAMES[(Number(data.today.slice(5, 7)) + 10) % 12].slice(0, 3).toLowerCase();
          const forgotExpenses = data.daysSinceLastExpense === null || data.daysSinceLastExpense >= EXPENSE_REMINDER_DAYS;
          const dueRecurring = data.recurring.filter((item) => item.due);
          const rankingMax = Math.max(1, ...data.ranking.map((item) => item.count));

          return (
            <div className="stack">
              {dueRecurring.length > 0 && (
                <Panel eyebrow="Despesas fixas" title="Para lançar este mês">
                  <ul className="list">
                    {dueRecurring.map((expense) => (
                      <RecurringRow key={expense.id} expense={expense} />
                    ))}
                  </ul>
                </Panel>
              )}

              {forgotExpenses && (
                <Alert tone="warning">
                  {data.daysSinceLastExpense === null
                    ? "Nenhum gasto lançado ainda."
                    : `Você não lança gastos há ${plural(data.daysSinceLastExpense, "dia", "dias")}.`}{" "}
                  Teve produto, luz, água ou manutenção?{" "}
                  <button type="button" className="link-button" onClick={() => setExpenseOpen(true)}>
                    Registrar gasto
                  </button>
                </Alert>
              )}

              {data.pendingOrders > 0 && (
                <Alert tone="info">
                  Há {plural(data.pendingOrders, "pedido", "pedidos")} de produtos aguardando.{" "}
                  <button type="button" className="link-button" onClick={() => navigate("produtos")}>
                    Ver pedidos
                  </button>
                </Alert>
              )}

              <Panel eyebrow="Toque para lançar" title="Lançamento rápido">
                <QuickEntry />
              </Panel>

              <MetricGrid>
                <Metric highlight label="Hoje" value={formatMoney(data.day.income)} hint={plural(data.day.services, "atendimento", "atendimentos")} />
                <Metric label="Esta semana" value={formatMoney(data.week.income)} hint={plural(data.week.services, "atendimento", "atendimentos")} />
                <Metric
                  label={`${MONTH_NAMES[Number(data.today.slice(5, 7)) - 1]} até hoje`}
                  value={formatMoney(data.month.income)}
                  hint={
                    <>
                      {plural(data.month.services, "atendimento", "atendimentos")}
                      {comparison(data.month.services, data.previousMonth.services, previousMonthName)}
                    </>
                  }
                />
                <Metric
                  label="Saldo do mês"
                  value={formatMoney(data.monthTotals.balance)}
                  hint={`${formatMoney(data.monthTotals.expenses)} em gastos · ticket médio ${formatMoney(data.month.averageTicket)}`}
                />
              </MetricGrid>

              <div className="grid-2">
                <Panel eyebrow={MONTH_NAMES[Number(data.today.slice(5, 7)) - 1]} title="Serviços do mês">
                  {data.ranking.length ? (
                    <ul className="breakdown">
                      {data.ranking.map((item) => (
                        <li key={item.name}>
                          <span>{item.name}</span>
                          <span className="breakdown__bar">
                            <span style={{ width: `${(item.count / rankingMax) * 100}%` }} />
                          </span>
                          <strong>
                            {item.count}× · {formatMoney(item.amountCents)}
                          </strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">Nenhum atendimento lançado neste mês.</p>
                  )}
                </Panel>

                <Panel
                  eyebrow="Faturamento"
                  title="Últimos 7 dias"
                  actions={<strong className="panel__total">{formatMoney(data.lastSevenDays.reduce((sum, item) => sum + item.income, 0))}</strong>}
                >
                  <BarChart
                    label="Faturamento dos últimos 7 dias"
                    selected={selectedDay}
                    onSelect={(key) => setSelectedDay(key === selectedDay ? "" : key)}
                    bars={data.lastSevenDays.map((item) => ({
                      key: item.date,
                      label: item.date === data.today ? "Hoje" : formatWeekdayShort(item.date),
                      title: formatLongDate(item.date),
                      value: item.income,
                    }))}
                  />
                  <p className="chart-caption" aria-live="polite">
                    {day ? (
                      <>
                        <span className="capitalize">{formatLongDate(day.date)}</span>: <strong>{formatMoney(day.income)}</strong>
                      </>
                    ) : (
                      "Toque em um dia para ver o valor."
                    )}
                  </p>
                </Panel>
              </div>
            </div>
          );
        }}
      </AsyncContent>

      {expenseOpen && <ExpenseModal onClose={() => setExpenseOpen(false)} />}
    </>
  );
}
