"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Collaborator = {
  id: number;
  name: string;
  email: string;
  active?: boolean;
  owner?: boolean;
};

type Appointment = {
  id: number;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  status: string;
  collaboratorId?: number | null;
};

type Data = {
  collaborators?: Collaborator[];
  appointments?: Appointment[];
};

export default function BarberPreviewClient() {
  const [data, setData] = useState<Data>({});
  const [selectedId, setSelectedId] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/data", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload: Data) => {
        setData(payload);
        const collaborators = payload.collaborators || [];
        const preferred =
          collaborators.find((item) => item.active && !item.owner) ||
          collaborators.find((item) => item.active) ||
          collaborators[0];
        if (preferred) setSelectedId(preferred.id);
      })
      .finally(() => setLoading(false));
  }, []);

  const collaborator = useMemo(
    () => (data.collaborators || []).find((item) => item.id === selectedId) || null,
    [data.collaborators, selectedId],
  );

  const appointments = useMemo(
    () => (data.appointments || []).filter((item) => item.collaboratorId === selectedId),
    [data.appointments, selectedId],
  );

  return (
    <main className="barber-preview-shell">
      <aside className="barber-preview-sidebar">
        <Link href="/" className="barber-preview-logo" aria-label="Voltar ao painel administrativo">
          <img src="/brand/yuri-barbershop-logo.png" alt="Yuri Barbershop" />
        </Link>
        <div className="barber-preview-user">
          <b>{collaborator?.name?.slice(0, 1).toUpperCase() || "C"}</b>
          <div>
            <strong>{collaborator?.name || "Colaborador"}</strong>
            <small>Pré-visualização do colaborador</small>
          </div>
        </div>
        <Link className="barber-preview-back" href="/">← Voltar ao Admin</Link>
      </aside>

      <section className="barber-preview-content">
        <header>
          <div>
            <small>AMBIENTE DO COLABORADOR • VISUALIZAÇÃO ADMIN</small>
            <h1>Painel do colaborador</h1>
          </div>
          <div className="barber-preview-header-actions">
            <label>
              Visualizar como
              <select value={selectedId} onChange={(event) => setSelectedId(Number(event.target.value))}>
                {(data.collaborators || []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}{item.owner ? " • proprietário" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        <div className="barber-preview-role">
          <div>
            <small>✂ ÁREA DO COLABORADOR</small>
            <strong>{collaborator?.name || "Colaborador"}</strong>
            <p>Pré-visualização segura, sem liberar funções administrativas.</p>
          </div>
          <em>ACESSO RESTRITO</em>
        </div>

        {loading ? (
          <div className="barber-preview-empty">Carregando ambiente do colaborador...</div>
        ) : !collaborator ? (
          <div className="barber-preview-empty">Nenhum colaborador disponível para pré-visualização.</div>
        ) : (
          <section className="barber-preview-panel barber-preview-full">
            <div className="barber-preview-panel-head">
              <div>
                <small>AGENDA</small>
                <h3>Atendimentos atribuídos a {collaborator.name}</h3>
              </div>
            </div>
            {appointments.length ? (
              appointments.slice(0, 30).map((item) => (
                <div className="barber-preview-appointment" key={item.id}>
                  <time>{item.time}</time>
                  <b>{item.clientName?.slice(0, 2).toUpperCase()}</b>
                  <div>
                    <strong>{item.clientName}</strong>
                    <small>{item.serviceName} • {item.date}</small>
                  </div>
                  <span className={item.status === "Pendente" ? "pending" : ""}>{item.status}</span>
                </div>
              ))
            ) : (
              <div className="barber-preview-empty">Nenhum atendimento atribuído a este colaborador.</div>
            )}
          </section>
        )}
      </section>
    </main>
  );
}
