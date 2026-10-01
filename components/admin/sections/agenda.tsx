"use client";

import { useState } from "react";
import { api, useApi } from "../../../lib/client/api";
import type { Appointment } from "../../../lib/client/types";
import { REFRESH } from "../../../lib/client/refresh";
import { useAction } from "../../../lib/client/use-action";
import { addDays, formatLongDate, todayKey } from "../../../lib/domain/dates";
import { formatMoney } from "../../../lib/domain/money";
import { FinalizeModal, NewAppointmentModal } from "../appointment-modals";
import { AppointmentStatus } from "../status";
import { useFeedback } from "../../ui/feedback-provider";
import { Button, IconButton } from "../../ui/button";
import { AsyncContent, EmptyState } from "../../ui/feedback";
import { Avatar, PageHeader, Tabs } from "../../ui/layout";

type View = "dia" | "semana";
type StatusFilter = "ativos" | "Pendente" | "Confirmado" | "Finalizado" | "Cancelado";

export default function AgendaSection() {
  const [view, setView] = useState<View>("dia");
  const [date, setDate] = useState(todayKey());
  const [filter, setFilter] = useState<StatusFilter>("ativos");
  const [creating, setCreating] = useState(false);
  const [finalizing, setFinalizing] = useState<Appointment | null>(null);

  const to = view === "dia" ? date : addDays(date, 6);
  const agenda = useApi<{ appointments: Appointment[] }>(`/api/appointments?from=${date}&to=${to}`);
  const today = todayKey();

  const step = view === "dia" ? 1 : 7;

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Agenda"
        description="Confirme, finalize ou cancele os atendimentos."
        actions={
          <Button icon="plus" onClick={() => setCreating(true)}>
            Novo agendamento
          </Button>
        }
      />

      <div className="toolbar">
        <div className="date-nav">
          <IconButton icon="chevronLeft" label="Período anterior" onClick={() => setDate(addDays(date, -step))} />
          <input type="date" aria-label="Data" value={date} onChange={(event) => event.target.value && setDate(event.target.value)} />
          <IconButton icon="chevronRight" label="Próximo período" onClick={() => setDate(addDays(date, step))} />
          {date !== today && (
            <Button variant="ghost" size="sm" onClick={() => setDate(today)}>
              Hoje
            </Button>
          )}
        </div>
        <Tabs
          label="Período"
          value={view}
          onChange={setView}
          items={[
            { value: "dia", label: "Dia" },
            { value: "semana", label: "7 dias" },
          ]}
        />
      </div>

      <AsyncContent {...agenda} onRetry={agenda.reload}>
        {({ appointments }) => {
          const counts = {
            ativos: appointments.filter((item) => item.status !== "Cancelado").length,
            Pendente: appointments.filter((item) => item.status === "Pendente").length,
            Confirmado: appointments.filter((item) => item.status === "Confirmado").length,
            Finalizado: appointments.filter((item) => item.status === "Finalizado").length,
            Cancelado: appointments.filter((item) => item.status === "Cancelado").length,
          };
          const visible = appointments.filter((item) =>
            filter === "ativos" ? item.status !== "Cancelado" : item.status === filter,
          );
          const days = [...new Set(visible.map((item) => item.date))];
          const expected = visible.filter((item) => item.status !== "Cancelado").reduce((sum, item) => sum + item.totalCents, 0);

          return (
            <div className="stack">
              <div className="toolbar">
                <Tabs
                  label="Filtrar por status"
                  value={filter}
                  onChange={setFilter}
                  items={[
                    { value: "ativos", label: "Ativos", count: counts.ativos },
                    { value: "Pendente", label: "Pendentes", count: counts.Pendente },
                    { value: "Confirmado", label: "Confirmados", count: counts.Confirmado },
                    { value: "Finalizado", label: "Finalizados", count: counts.Finalizado },
                    { value: "Cancelado", label: "Cancelados", count: counts.Cancelado },
                  ]}
                />
                <span className="muted">Previsto: {formatMoney(expected)}</span>
              </div>

              {visible.length ? (
                days.map((day) => (
                  <section key={day} className="agenda-day">
                    <h3 className="agenda-day__title capitalize">
                      {day === today ? "Hoje · " : ""}
                      {formatLongDate(day)}
                    </h3>
                    <ul className="appointment-list">
                      {visible
                        .filter((item) => item.date === day)
                        .map((item) => (
                          <AppointmentRow key={item.id} appointment={item} onFinalize={() => setFinalizing(item)} />
                        ))}
                    </ul>
                  </section>
                ))
              ) : (
                <EmptyState
                  icon="calendar"
                  title="Nenhum atendimento neste período"
                  action={
                    <Button variant="secondary" icon="plus" onClick={() => setCreating(true)}>
                      Agendar
                    </Button>
                  }
                />
              )}
            </div>
          );
        }}
      </AsyncContent>

      <NewAppointmentModal open={creating} onClose={() => setCreating(false)} initialDate={date} onCreated={(appointment) => setDate(appointment.date)} />
      {finalizing && <FinalizeModal key={finalizing.id} appointment={finalizing} onClose={() => setFinalizing(null)} />}
    </>
  );
}

function AppointmentRow({ appointment, onFinalize }: { appointment: Appointment; onFinalize: () => void }) {
  const { busy, run } = useAction();
  const feedback = useFeedback();
  const open = appointment.status === "Pendente" || appointment.status === "Confirmado";

  const setStatus = (status: "Confirmado" | "Cancelado") =>
    run(() => api(`/api/appointments/${appointment.id}`, { method: "PATCH", body: { status } }), {
      success: status === "Confirmado" ? "Agendamento confirmado." : "Agendamento cancelado e horário liberado.",
      refresh: REFRESH.agenda,
    });

  async function cancel() {
    const confirmed = await feedback.confirm({
      title: "Cancelar agendamento?",
      message: `O horário das ${appointment.time} de ${appointment.clientName} será liberado.`,
      confirmLabel: "Cancelar agendamento",
      danger: true,
    });
    if (confirmed) await setStatus("Cancelado");
  }

  return (
    <li className={`appointment ${appointment.status === "Cancelado" ? "is-cancelled" : ""}`}>
      <span className="appointment__time">{appointment.time}</span>
      <div className="appointment__body">
        <div className="appointment__head">
          <Avatar name={appointment.clientName} size="sm" />
          <strong>{appointment.clientName}</strong>
          <AppointmentStatus status={appointment.status} />
        </div>
        <p className="appointment__services">
          {appointment.serviceName} · <strong>{formatMoney(appointment.totalCents)}</strong>
          {appointment.collaboratorName && <> · {appointment.collaboratorName}</>}
        </p>
        {appointment.status === "Finalizado" && (
          <p className="appointment__meta">
            Pagamento: {appointment.paymentMethod || "—"}
            {appointment.commissionCents > 0 && ` · Comissão ${appointment.commissionPercent}% (${formatMoney(appointment.commissionCents)})`}
          </p>
        )}
        {appointment.adminMessage && <p className="appointment__meta">{appointment.adminMessage}</p>}
      </div>
      {open && (
        <div className="appointment__actions">
          {appointment.status === "Pendente" && (
            <Button variant="secondary" size="sm" icon="check" loading={busy} onClick={() => setStatus("Confirmado")}>
              Confirmar
            </Button>
          )}
          <Button size="sm" icon="star" disabled={busy} onClick={onFinalize}>
            Finalizar
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={cancel}>
            Cancelar
          </Button>
        </div>
      )}
    </li>
  );
}
