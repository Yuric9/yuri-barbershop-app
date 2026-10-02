"use client";

import { useState } from "react";
import { useApi } from "../../../lib/client/api";
import type { Dashboard } from "../../../lib/client/types";
import { formatDate, formatLongDate, formatWeekdayShort } from "../../../lib/domain/dates";
import { formatMoney } from "../../../lib/domain/money";
import { NewAppointmentModal } from "../appointment-modals";
import type { SectionProps } from "../admin-app";
import { BarChart } from "../bar-chart";
import { AppointmentStatus } from "../status";
import { Button } from "../../ui/button";
import { Alert, AsyncContent, EmptyState } from "../../ui/feedback";
import { Avatar, Metric, MetricGrid, PageHeader, Panel } from "../../ui/layout";

/** Primeiro nome com inicial maiúscula (ex.: "yuri césar" → "Yuri"). */
function firstName(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return first.charAt(0).toLocaleUpperCase("pt-BR") + first.slice(1);
}

export default function DashboardSection({ navigate, user }: SectionProps) {
  const dashboard = useApi<Dashboard>("/api/dashboard");
  const [creating, setCreating] = useState(false);
  const [selectedDay, setSelectedDay] = useState("");

  return (
    <>
      <PageHeader
        className="page-header--greeting"
        eyebrow="Visão geral"
        title={`Olá, ${firstName(user.name)}!`}
        description="Resumo do dia e dos próximos atendimentos."
        actions={
          <Button variant="secondary" icon="calendar" onClick={() => setCreating(true)}>
            Novo agendamento
          </Button>
        }
        primary={{ label: "Lançar no caixa", icon: "cash", onClick: () => navigate("caixa") }}
      />

      <AsyncContent {...dashboard} onRetry={dashboard.reload}>
        {(data) => {
          const day = data.lastSevenDays.find((item) => item.date === selectedDay);
          return (
            <div className="stack">
              {data.pendingOrders > 0 && (
                <Alert tone="warning">
                  Há {data.pendingOrders} pedido(s) de produtos aguardando.{" "}
                  <button type="button" className="link-button" onClick={() => navigate("produtos")}>
                    Ver pedidos
                  </button>
                </Alert>
              )}

              <MetricGrid>
                <Metric highlight label="Faturamento hoje" value={formatMoney(data.todayIncomeCents)} hint="Entradas registradas no caixa" />
                <Metric
                  label="Atendimentos concluídos"
                  value={data.completedToday.count}
                  hint={`${data.scheduledToday} agendado(s) hoje · ${data.pendingToday} pendente(s)`}
                />
                <Metric label="Ticket médio" value={formatMoney(data.completedToday.averageTicket)} hint="Média dos serviços concluídos hoje" />
                <Metric label="Saldo do mês" value={formatMoney(data.month.balance)} hint={`${formatMoney(data.month.income)} de entradas`} />
              </MetricGrid>

              <div className="grid-2">
                <Panel
                  eyebrow="Agenda"
                  title="Próximos atendimentos"
                  actions={
                    <Button variant="ghost" size="sm" onClick={() => navigate("agenda")}>
                      Ver agenda
                    </Button>
                  }
                >
                  {data.upcoming.length ? (
                    <ul className="list">
                      {data.upcoming.map((item) => (
                        <li key={item.id} className="list__item">
                          <span className="list__time">
                            <strong>{item.time}</strong>
                            <small>{item.date === data.today ? "Hoje" : formatDate(item.date).slice(0, 5)}</small>
                          </span>
                          <Avatar name={item.clientName} size="sm" />
                          <span className="list__main">
                            <strong>{item.clientName}</strong>
                            <small>
                              {item.serviceName}
                              {item.collaboratorName ? ` · ${item.collaboratorName}` : ""}
                            </small>
                          </span>
                          <AppointmentStatus status={item.status} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState icon="calendar" title="Nenhum atendimento futuro" />
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

      <NewAppointmentModal open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
