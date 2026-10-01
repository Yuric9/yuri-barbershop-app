"use client";

import { useMemo, useState } from "react";
import { api, useApi } from "../../lib/client/api";
import { useClients, useCollaborators, useServices } from "../../lib/client/resources";
import type { Appointment } from "../../lib/client/types";
import { REFRESH } from "../../lib/client/refresh";
import { useAction } from "../../lib/client/use-action";
import { COURTESY, PAYMENT_METHODS } from "../../lib/domain/catalog";
import { formatDate, todayKey } from "../../lib/domain/dates";
import { formatMoney } from "../../lib/domain/money";
import { whatsappLink } from "../../lib/domain/phone";
import { Button } from "../ui/button";
import { Alert, LoadingState } from "../ui/feedback";
import { SelectField, TextAreaField, TextField } from "../ui/field";
import { Icon } from "../ui/icon";
import { Tabs } from "../ui/layout";
import { Modal } from "../ui/modal";
import { ClientPicker } from "./client-picker";

const emptyClient = { name: "", phone: "", birthDate: "" };

type NewAppointmentProps = {
  onClose: () => void;
  initialDate?: string;
  /** Chamado após salvar (ex.: para a agenda mostrar o dia do agendamento). */
  onCreated?: (appointment: Appointment) => void;
};

export function NewAppointmentModal({ open, ...props }: NewAppointmentProps & { open: boolean }) {
  return open ? <NewAppointmentForm {...props} /> : null;
}

function NewAppointmentForm({ onClose, initialDate, onCreated }: NewAppointmentProps) {
  const services = useServices();
  const clients = useClients();
  const collaborators = useCollaborators();
  const { busy, run } = useAction();

  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [clientEmail, setClientEmail] = useState("");
  const [newClient, setNewClient] = useState(emptyClient);
  const [serviceIds, setServiceIds] = useState<number[]>([]);
  const [collaboratorId, setCollaboratorId] = useState("");
  const [date, setDate] = useState(initialDate && initialDate >= todayKey() ? initialDate : todayKey());
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [created, setCreated] = useState<{ appointment: Appointment; phone: string } | null>(null);

  const activeServices = (services.data?.services ?? []).filter((service) => service.active);
  const activeCollaborators = (collaborators.data?.collaborators ?? []).filter((item) => item.active);
  const chosen = activeServices.filter((service) => serviceIds.includes(service.id));
  const totalCents = chosen.reduce((sum, service) => sum + service.priceCents, 0);
  const durationMin = chosen.reduce((sum, service) => sum + service.durationMin, 0);

  const availabilityUrl = useMemo(() => {
    if (!date || !serviceIds.length) return null;
    const query = new URLSearchParams({ date, serviceIds: serviceIds.join(",") });
    if (collaboratorId) query.set("collaboratorId", collaboratorId);
    return `/api/appointments/availability?${query}`;
  }, [date, serviceIds, collaboratorId]);
  const availability = useApi<{ times: string[]; durationMin: number }>(availabilityUrl);
  const times = availability.data?.times ?? [];

  function toggleService(id: number) {
    setServiceIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    setTime("");
  }

  const clientReady = clientMode === "existing" ? Boolean(clientEmail) : Boolean(newClient.name.trim() && newClient.phone.trim());
  const ready = clientReady && serviceIds.length > 0 && Boolean(date) && Boolean(time);

  async function submit() {
    if (!ready) return;
    const result = await run(
      () =>
        api<{ appointment: Appointment }>("/api/appointments", {
          method: "POST",
          body: {
            ...(clientMode === "existing" ? { clientEmail } : { newClient }),
            serviceIds,
            collaboratorId: collaboratorId ? Number(collaboratorId) : null,
            date,
            time,
            note,
          },
        }),
      { success: "Agendamento criado.", refresh: REFRESH.agenda },
    );
    if (result) {
      const phone = clientMode === "new" ? newClient.phone : clients.data?.clients.find((client) => client.email === clientEmail)?.phone ?? "";
      setCreated({ appointment: result.appointment, phone });
      onCreated?.(result.appointment);
    }
  }

  if (created) {
    const { appointment, phone } = created;
    const message = `Olá, ${appointment.clientName.split(" ")[0]}! Seu horário na Yuri Barbershop está agendado ✂️\n\n${appointment.serviceName}\n${formatDate(appointment.date)} às ${appointment.time}${appointment.collaboratorName ? `\nProfissional: ${appointment.collaboratorName}` : ""}\nValor: ${formatMoney(appointment.totalCents)}\n\nAté lá!`;
    return (
      <Modal
        open
        title="Agendamento criado"
        onClose={onClose}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
            {phone && (
              <a className="button button--primary button--md" href={whatsappLink(phone, message)} target="_blank" rel="noreferrer">
                <Icon name="whatsapp" size={18} />
                <span>Enviar confirmação</span>
              </a>
            )}
          </>
        }
      >
        <div className="summary-list">
          <div><span>Cliente</span><strong>{appointment.clientName}</strong></div>
          <div><span>Serviços</span><strong>{appointment.serviceName}</strong></div>
          <div><span>Data e horário</span><strong>{formatDate(appointment.date)} às {appointment.time}</strong></div>
          <div><span>Profissional</span><strong>{appointment.collaboratorName || "Barbearia"}</strong></div>
          <div><span>Valor</span><strong>{formatMoney(appointment.totalCents)}</strong></div>
        </div>
      </Modal>
    );
  }

  const loading = services.loading || clients.loading || collaborators.loading;

  return (
    <Modal
      open
      size="lg"
      title="Novo agendamento"
      description="O horário fica reservado assim que o agendamento é salvo."
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <span className="modal__summary">
            {chosen.length ? `${durationMin} min · ${formatMoney(totalCents)}` : "Nenhum serviço escolhido"}
          </span>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy} disabled={!ready}>
            Agendar
          </Button>
        </>
      }
    >
      {loading ? (
        <LoadingState />
      ) : (
        <div className="form-sections">
          <fieldset className="form-section">
            <legend>1. Cliente</legend>
            <Tabs
              label="Tipo de cliente"
              value={clientMode}
              onChange={setClientMode}
              items={[
                { value: "existing", label: "Cliente cadastrado" },
                { value: "new", label: "Novo cliente" },
              ]}
            />
            {clientMode === "existing" ? (
              <ClientPicker clients={clients.data?.clients ?? []} value={clientEmail} onChange={setClientEmail} />
            ) : (
              <div className="form-grid">
                <TextField label="Nome" required value={newClient.name} onChange={(event) => setNewClient({ ...newClient, name: event.target.value })} />
                <TextField label="Telefone / WhatsApp" inputMode="tel" placeholder="(62) 99999-9999" required value={newClient.phone} onChange={(event) => setNewClient({ ...newClient, phone: event.target.value })} />
                <TextField label="Aniversário (opcional)" type="date" value={newClient.birthDate} onChange={(event) => setNewClient({ ...newClient, birthDate: event.target.value })} />
              </div>
            )}
          </fieldset>

          <fieldset className="form-section">
            <legend>2. Serviços</legend>
            <div className="choice-grid">
              {activeServices.map((service) => (
                <label key={service.id} className={`choice ${serviceIds.includes(service.id) ? "is-selected" : ""}`}>
                  <input type="checkbox" checked={serviceIds.includes(service.id)} onChange={() => toggleService(service.id)} />
                  <span className="choice__title">{service.name}</span>
                  <span className="choice__meta">
                    {service.durationMin} min · {formatMoney(service.priceCents)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>3. Profissional, data e horário</legend>
            <div className="form-grid">
              <SelectField label="Profissional" value={collaboratorId} onChange={(event) => { setCollaboratorId(event.target.value); setTime(""); }}>
                <option value="">Qualquer disponível</option>
                {activeCollaborators.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </SelectField>
              <TextField label="Data" type="date" min={todayKey()} required value={date} onChange={(event) => { setDate(event.target.value); setTime(""); }} />
            </div>
            {!serviceIds.length ? (
              <p className="muted">Escolha os serviços para ver os horários livres.</p>
            ) : availability.error ? (
              <Alert tone="danger">{availability.error}</Alert>
            ) : availability.loading ? (
              <LoadingState label="Conferindo horários..." />
            ) : times.length ? (
              <div className="time-grid" role="radiogroup" aria-label="Horários disponíveis">
                {times.map((slot) => (
                  <button type="button" role="radio" aria-checked={time === slot} key={slot} className={time === slot ? "is-selected" : ""} onClick={() => setTime(slot)}>
                    {slot}
                  </button>
                ))}
              </div>
            ) : (
              <Alert tone="warning">Não há horários livres nesta data para a duração escolhida ({durationMin} min).</Alert>
            )}
          </fieldset>

          <TextAreaField label="Observação (opcional)" maxLength={240} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
      )}
    </Modal>
  );
}

/** Finalização: escolhe a forma de pagamento e lança no caixa. */
export function FinalizeModal({ appointment, onClose }: { appointment: Appointment | null; onClose: () => void }) {
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);
  const clients = useClients();
  const { busy, run } = useAction();
  if (!appointment) return null;

  const loyalty = clients.data?.clients.find((client) => client.email === appointment.clientEmail)?.loyalty;
  const courtesy = paymentMethod === COURTESY;

  async function submit() {
    if (!appointment) return;
    const done = await run(
      () => api(`/api/appointments/${appointment.id}`, { method: "PATCH", body: { status: "Finalizado", paymentMethod } }),
      { success: courtesy ? "Atendimento finalizado como cortesia." : "Atendimento finalizado e lançado no caixa.", refresh: REFRESH.agenda },
    );
    if (done) onClose();
  }

  return (
    <Modal
      open
      title="Finalizar atendimento"
      description={`${appointment.clientName} · ${appointment.serviceName}`}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Voltar
          </Button>
          <Button type="submit" icon="check" loading={busy}>
            Finalizar
          </Button>
        </>
      }
    >
      <div className="form-sections">
        <div className="summary-list">
          <div><span>Valor</span><strong>{courtesy ? `${formatMoney(0)} (cortesia)` : formatMoney(appointment.totalCents)}</strong></div>
          <div><span>Profissional</span><strong>{appointment.collaboratorName || "Barbearia"}</strong></div>
        </div>
        <SelectField label="Forma de pagamento" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
          {PAYMENT_METHODS.map((method) => (
            <option key={method}>{method}</option>
          ))}
          <option value={COURTESY} disabled={!loyalty?.rewardAvailable}>
            Cortesia do cartão fidelidade{loyalty?.rewardAvailable ? "" : " (indisponível)"}
          </option>
        </SelectField>
        {loyalty?.rewardAvailable && !courtesy && (
          <Alert tone="success">Este cliente tem um atendimento gratuito disponível no cartão fidelidade.</Alert>
        )}
        {courtesy ? (
          <Alert tone="info">Nenhum valor será lançado no caixa e um benefício do cartão fidelidade será usado.</Alert>
        ) : (
          <p className="muted">O valor será lançado como entrada no caixa e a comissão do profissional será calculada.</p>
        )}
      </div>
    </Modal>
  );
}
