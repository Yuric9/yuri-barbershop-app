"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Section = "inicio" | "mensagens" | "agenda" | "ganhos" | "perfil";

type Collaborator = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  defaultCommissionPercent?: number;
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
  collaboratorName?: string;
  commissionPercent?: number;
  commissionCents?: number;
  totalCents?: number;
};

type Data = {
  isAdmin?: boolean;
  collaborators?: Collaborator[];
  appointments?: Appointment[];
};

const labels: Record<Section, string> = {
  inicio: "Meu painel",
  mensagens: "Caixa de entrada",
  agenda: "Minha agenda",
  ganhos: "Meus ganhos",
  perfil: "Meu perfil",
};

const icons: Record<Section, string> = {
  inicio: "⌂",
  mensagens: "✉",
  agenda: "□",
  ganhos: "↗",
  perfil: "◉",
};

function localToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function money(cents = 0) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((Number(cents) || 0) / 100);
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

export default function BarberPreviewClient() {
  const [section, setSection] = useState<Section>("inicio");
  const [data, setData] = useState<Data>({});
  const [selectedId, setSelectedId] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/data", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload: Data) => {
        setData(payload);
        const collaborators = payload.collaborators || [];
        const preferred = collaborators.find((item) => item.active && !item.owner) || collaborators.find((item) => item.active) || collaborators[0];
        if (preferred) setSelectedId(preferred.id);
      })
      .finally(() => setLoading(false));
  }, []);

  const collaborator = useMemo(() => (data.collaborators || []).find((item) => item.id === selectedId) || null, [data.collaborators, selectedId]);
  const appointments = useMemo(() => (data.appointments || []).filter((item) => item.collaboratorId === selectedId), [data.appointments, selectedId]);
  const finalized = appointments.filter((item) => item.status === "Finalizado");
  const today = localToday();
  const todayRows = appointments.filter((item) => item.date === today && item.status !== "Cancelado");
  const todayFinalized = todayRows.filter((item) => item.status === "Finalizado");
  const futureRows = appointments
    .filter((item) => item.date >= today && item.status !== "Cancelado")
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const monthPrefix = today.slice(0, 7);
  const monthFinalized = finalized.filter((item) => item.date?.startsWith(monthPrefix));
  const todayEarnings = todayFinalized.reduce((sum, item) => sum + Number(item.commissionCents || 0), 0);
  const monthEarnings = monthFinalized.reduce((sum, item) => sum + Number(item.commissionCents || 0), 0);
  const totalEarnings = finalized.reduce((sum, item) => sum + Number(item.commissionCents || 0), 0);
  const next = futureRows[0] || null;

  function renderSection() {
    if (loading) return <div className="barber-preview-empty">Carregando ambiente do colaborador...</div>;
    if (!collaborator) return <div className="barber-preview-empty">Cadastre um colaborador no Admin para visualizar o ambiente completo.</div>;

    if (section === "mensagens") {
      return <section className="barber-preview-panel barber-preview-full"><div className="barber-preview-panel-head"><div><small>COMUNICAÇÃO</small><h3>Caixa de entrada</h3></div></div><div className="barber-preview-empty"><b>✉</b><strong>Mensagens do colaborador</strong><span>Quando o colaborador entrar com a própria conta, aqui aparecerão apenas as mensagens destinadas a ele.</span></div></section>;
    }

    if (section === "agenda") {
      return <section className="barber-preview-panel barber-preview-full"><div className="barber-preview-panel-head"><div><small>MINHA AGENDA</small><h3>Atendimentos atribuídos a {collaborator.name}</h3></div></div>{futureRows.length ? futureRows.map((item) => <div className="barber-preview-appointment" key={item.id}><time>{item.time}</time><b>{item.clientName?.slice(0,2).toUpperCase()}</b><div><strong>{item.clientName}</strong><small>{item.serviceName} • {formatDate(item.date)}</small></div><span className={item.status === "Pendente" ? "pending" : ""}>{item.status}</span></div>) : <div className="barber-preview-empty">Nenhum atendimento futuro atribuído a este colaborador.</div>}<p className="barber-preview-safety">Na pré-visualização administrativa, as ações de aceitar/finalizar/cancelar ficam desativadas para não alterar atendimentos reais.</p></section>;
    }

    if (section === "ganhos") {
      return <><div className="barber-preview-metrics"><article className="featured"><small>GANHOS DE HOJE</small><strong>{money(todayEarnings)}</strong><span>Comissões finalizadas hoje</span></article><article><small>GANHOS DO MÊS</small><strong>{money(monthEarnings)}</strong><span>Acumulado no mês atual</span></article><article><small>FINALIZADOS</small><strong>{monthFinalized.length}</strong><span>Atendimentos no mês</span></article><article><small>PERCENTUAL PADRÃO</small><strong>{collaborator.defaultCommissionPercent ?? 0}%</strong><span>Pode variar por serviço</span></article></div><section className="barber-preview-panel barber-preview-full"><div className="barber-preview-panel-head"><div><small>HISTÓRICO</small><h3>Comissões por atendimento</h3></div></div>{finalized.length ? finalized.slice(0, 30).map((item) => <div className="barber-preview-earning" key={item.id}><span>{formatDate(item.date)} • {item.clientName} • {item.serviceName}</span><strong>{money(item.commissionCents)}</strong></div>) : <div className="barber-preview-empty">Nenhuma comissão finalizada para este colaborador.</div>}<div className="barber-preview-total"><span>Total acumulado</span><strong>{money(totalEarnings)}</strong></div></section></>;
    }

    if (section === "perfil") {
      return <section className="barber-preview-panel barber-preview-profile"><div className="barber-preview-profile-head"><b>{collaborator.name?.slice(0,1).toUpperCase()}</b><div><small>PERFIL PROFISSIONAL</small><h3>{collaborator.name}</h3><span>{collaborator.active === false ? "Acesso bloqueado" : "Colaborador ativo"}</span></div></div><div className="barber-preview-profile-grid"><span><small>E-mail de acesso</small><strong>{collaborator.email}</strong></span><span><small>Telefone</small><strong>{collaborator.phone || "Não informado"}</strong></span><span><small>Comissão padrão</small><strong>{collaborator.defaultCommissionPercent ?? 0}%</strong></span><span><small>Tipo de acesso</small><strong>Colaborador restrito</strong></span></div><div className="barber-preview-note"><strong>Sem permissões administrativas.</strong><span>Este perfil não acessa Caixa geral, Clientes, Relatórios, Remarketing, Clube Yuri, Mercado Pago ou configurações da empresa.</span></div></section>;
    }

    return <><section className="barber-preview-hero"><div><small>BOM TRABALHO, {collaborator.name.split(" ")[0].toUpperCase()}</small><h2>Seu dia na Yuri Barbershop</h2><p>Agenda e ganhos do trabalho em um ambiente simples e focado.</p></div><span>{new Date().toLocaleDateString("pt-BR")}</span></section><div className="barber-preview-metrics"><article className="featured"><small>ATENDIMENTOS HOJE</small><strong>{todayRows.length}</strong><span>{todayRows.filter((item) => item.status === "Pendente").length} pendente(s)</span></article><article><small>GANHOS DE HOJE</small><strong>{money(todayEarnings)}</strong><span>Comissões finalizadas</span></article><article><small>GANHOS DO MÊS</small><strong>{money(monthEarnings)}</strong><span>Acumulado do período</span></article><article><small>PRÓXIMO CLIENTE</small><strong>{next?.time || "—"}</strong><span>{next ? `${next.clientName} • ${next.serviceName}` : "Agenda livre"}</span></article></div><div className="barber-preview-grid"><section className="barber-preview-panel"><div className="barber-preview-panel-head"><div><small>MINHA AGENDA</small><h3>Próximos atendimentos</h3></div><button onClick={() => setSection("agenda")}>Ver agenda</button></div>{futureRows.slice(0,4).map((item) => <div className="barber-preview-appointment" key={item.id}><time>{item.time}</time><b>{item.clientName?.slice(0,2).toUpperCase()}</b><div><strong>{item.clientName}</strong><small>{item.serviceName} • {formatDate(item.date)}</small></div><span className={item.status === "Pendente" ? "pending" : ""}>{item.status}</span></div>)}{!futureRows.length && <div className="barber-preview-empty">Nenhum atendimento futuro.</div>}</section><section className="barber-preview-panel"><div className="barber-preview-panel-head"><div><small>MEUS GANHOS</small><h3>Resumo de comissão</h3></div><button onClick={() => setSection("ganhos")}>Ver ganhos</button></div><div className="barber-preview-earning"><span>Finalizados no mês</span><strong>{monthFinalized.length}</strong></div><div className="barber-preview-earning"><span>Percentual padrão</span><strong>{collaborator.defaultCommissionPercent ?? 0}%</strong></div><div className="barber-preview-earning"><span>Comissões do mês</span><strong>{money(monthEarnings)}</strong></div></section></div></>;
  }

  return <main className="barber-preview-shell"><aside className="barber-preview-sidebar"><Link href="/ className="barber-preview-logo" aria-label="Voltar ao painel administrativo"><img src="/brand/yuri-barbershop-logo.png" alt="Yuri Barbershop" /></Link><nav>{(Object.keys(labels) as Section[]).map((key) => <button key={key} className={section === key ? "active" : ""} onClick={() => setSection(key)}><span>{icons[key]}</span>{labels[key]}</button>)}</nav><div className="barber-preview-user"><b>{collaborator?.name?.slice(0,1).toUpperCase() || "C"}</b><div><strong>{collaborator?.name || "Colaborador"}</strong><small>Barbeiro colaborador</small></div></div><a className="barber-preview-back" href="/">← Voltar ao Admin</Link></aside><section className="barber-preview-content"><header><div><small>AMBIENTE DO COLABORADOR • VISUALIZAÇÃO ADMIN</small><h1>{labels[section]}</h1></div><div className="barber-preview-header-actions"><label>Visualizar como<select value={selectedId} onChange={(event) => setSelectedId(Number(event.target.value))}>{(data.collaborators || []).map((item) => <option key={item.id} value={item.id}>{item.name}{item.owner ? " • proprietário" : ""}</option>)}</select></label><span>Somente você vê esta simulação</span></div></header><div className="barber-preview-role"><div><small>✂ ÁREA DO COLABORADOR</small><strong>{labels[section]}</strong><p>Este ambiente imita a experiência real do colaborador, sem liberar funções administrativas.</p></div><em>ACESSO RESTRITO</em></div>{renderSection()}</section></main>;
}
