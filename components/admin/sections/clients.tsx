"use client";

import { useMemo, useState } from "react";
import { api } from "../../../lib/client/api";
import { REFRESH } from "../../../lib/client/refresh";
import { useClients } from "../../../lib/client/resources";
import type { ClientSummary } from "../../../lib/client/types";
import { useAction } from "../../../lib/client/use-action";
import { parseContactsFile, type ContactCandidate } from "../../../lib/domain/contacts";
import { formatDate } from "../../../lib/domain/dates";
import { formatMoney } from "../../../lib/domain/money";
import { formatPhone, isTechnicalEmail, phoneDigits, whatsappLink } from "../../../lib/domain/phone";
import { Button } from "../../ui/button";
import { Alert, AsyncContent, EmptyState } from "../../ui/feedback";
import { CheckboxField, TextField } from "../../ui/field";
import { Icon } from "../../ui/icon";
import { Avatar, Badge, PageHeader } from "../../ui/layout";
import { Modal } from "../../ui/modal";

export default function ClientsSection() {
  const clients = useClients();
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"new" | "import" | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);

  const list = useMemo(() => {
    const all = clients.data?.clients ?? [];
    const text = query.trim().toLocaleLowerCase("pt-BR");
    const digits = phoneDigits(query);
    if (!text) return all;
    return all.filter((client) => client.name.toLocaleLowerCase("pt-BR").includes(text) || (digits.length >= 3 && phoneDigits(client.phone).includes(digits)));
  }, [clients.data, query]);

  const selected = clients.data?.clients.find((client) => client.email === selectedEmail) ?? null;

  return (
    <>
      <PageHeader
        eyebrow="Relacionamento"
        title="Clientes"
        description="Cadastro, histórico e cartão fidelidade de cada cliente."
        actions={
          <>
            <Button variant="secondary" icon="upload" onClick={() => setModal("import")}>
              Importar contatos
            </Button>
            <Button icon="plus" onClick={() => setModal("new")}>
              Novo cliente
            </Button>
          </>
        }
      />

      <AsyncContent {...clients} onRetry={clients.reload}>
        {(data) => (
          <div className="stack">
            <div className="toolbar">
              <label className="search">
                <Icon name="search" size={18} />
                <input type="search" placeholder="Buscar por nome ou telefone" aria-label="Buscar cliente" value={query} onChange={(event) => setQuery(event.target.value)} />
              </label>
              <span className="muted">
                {list.length} de {data.clients.length} cliente(s)
              </span>
            </div>

            {list.length ? (
              <div className="table-wrap">
                <table className="table table--clickable">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Último atendimento</th>
                      <th className="table__number">Atendimentos</th>
                      <th className="table__number">Total gasto</th>
                      <th>Fidelidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((client) => (
                      <tr key={client.email} onClick={() => setSelectedEmail(client.email)}>
                        <td data-label="Cliente">
                          <button type="button" className="cell-button" onClick={() => setSelectedEmail(client.email)}>
                            <Avatar name={client.name} size="sm" />
                            <span>
                              <strong>{client.name}</strong>
                              <small>{client.phone ? formatPhone(client.phone) : "Sem telefone"}</small>
                            </span>
                          </button>
                        </td>
                        <td data-label="Último atendimento">
                          {client.lastVisit ? (
                            <>
                              {formatDate(client.lastVisit)}
                              <small>{client.lastService}</small>
                            </>
                          ) : (
                            <span className="muted">Nenhum</span>
                          )}
                        </td>
                        <td data-label="Atendimentos" className="table__number">{client.appointmentsCount}</td>
                        <td data-label="Total gasto" className="table__number">{formatMoney(client.totalSpentCents)}</td>
                        <td data-label="Fidelidade">
                          <LoyaltyBadge client={client} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon="users" title={query ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}>
                {query ? "Confira o nome ou telefone digitado." : "Cadastre clientes ou importe os contatos do celular."}
              </EmptyState>
            )}
          </div>
        )}
      </AsyncContent>

      {modal === "new" && <NewClientModal onClose={() => setModal(null)} />}
      {modal === "import" && <ImportModal onClose={() => setModal(null)} />}
      {selected && <ClientModal key={selected.email} client={selected} onClose={() => setSelectedEmail(null)} />}
    </>
  );
}

function LoyaltyBadge({ client }: { client: ClientSummary }) {
  if (client.loyalty.rewardAvailable) return <Badge tone="gold">Cortesia disponível</Badge>;
  return (
    <span className="loyalty-mini" aria-label={`${client.loyalty.progress} de ${client.loyalty.target} atendimentos`}>
      <span className="loyalty-mini__bar">
        <span style={{ width: `${(client.loyalty.progress / client.loyalty.target) * 100}%` }} />
      </span>
      {client.loyalty.progress}/{client.loyalty.target}
    </span>
  );
}

function NewClientModal({ onClose }: { onClose: () => void }) {
  const { busy, run } = useAction();
  const [form, setForm] = useState({ name: "", phone: "", birthDate: "" });

  async function submit() {
    const done = await run(() => api("/api/clients", { method: "POST", body: form }), { success: "Cliente salvo.", refresh: REFRESH.clients });
    if (done) onClose();
  }

  return (
    <Modal
      open
      title="Novo cliente"
      description="Se o telefone já estiver cadastrado, o cadastro existente será atualizado."
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy}>
            Salvar cliente
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <TextField label="Nome" required autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <TextField label="Telefone / WhatsApp" required inputMode="tel" placeholder="(62) 99999-9999" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        <TextField label="Aniversário (opcional)" type="date" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} />
      </div>
    </Modal>
  );
}

function ClientModal({ client, onClose }: { client: ClientSummary; onClose: () => void }) {
  const { busy, run } = useAction();
  const [form, setForm] = useState({ name: client.name, phone: client.phone, birthDate: client.birthDate });
  const [adjust, setAdjust] = useState({ targetCount: String(client.loyalty.eligibleVisits), note: "" });
  const path = `/api/clients/${encodeURIComponent(client.email)}`;
  const loyalty = client.loyalty;

  const save = () => run(() => api(path, { method: "PATCH", body: form }), { success: "Dados atualizados.", refresh: REFRESH.clients });
  async function saveLoyalty() {
    const done = await run(() => api(`${path}/loyalty`, { method: "POST", body: { targetCount: Number(adjust.targetCount), note: adjust.note } }), {
      success: "Cartão fidelidade ajustado.",
      refresh: REFRESH.clients,
    });
    if (done) setAdjust((current) => ({ ...current, note: "" }));
  }

  return (
    <Modal
      open
      size="lg"
      title={client.name}
      description={isTechnicalEmail(client.email) ? `Cliente desde ${formatDate(client.createdAt.slice(0, 10))}` : client.email}
      onClose={onClose}
    >
      <div className="form-sections">
        <div className="stat-row">
          <div><span>Atendimentos</span><strong>{client.appointmentsCount}</strong></div>
          <div><span>Finalizados</span><strong>{client.finalizedCount}</strong></div>
          <div><span>Total gasto</span><strong>{formatMoney(client.totalSpentCents)}</strong></div>
          <div><span>Último</span><strong>{client.lastVisit ? formatDate(client.lastVisit) : "—"}</strong></div>
        </div>

        {client.phone && (
          <a className="button button--secondary button--md button--fit" href={whatsappLink(client.phone, `Olá, ${client.name.split(" ")[0]}! Tudo bem?`)} target="_blank" rel="noreferrer">
            <Icon name="whatsapp" size={18} />
            <span>Conversar no WhatsApp</span>
          </a>
        )}

        <fieldset className="form-section">
          <legend>Dados do cliente</legend>
          <div className="form-grid">
            <TextField label="Nome" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <TextField label="Telefone" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            <TextField label="Aniversário" type="date" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} />
          </div>
          <Button variant="secondary" className="button--fit" loading={busy} onClick={save}>
            Salvar dados
          </Button>
        </fieldset>

        <fieldset className="form-section">
          <legend>Cartão fidelidade</legend>
          <div className="loyalty-card">
            <div className="loyalty-card__stamps" aria-label={`${loyalty.progress} de ${loyalty.target} atendimentos`}>
              {Array.from({ length: loyalty.target }, (_, index) => (
                <span key={index} className={index < loyalty.progress ? "is-filled" : ""}>
                  {index < loyalty.progress ? <Icon name="check" size={16} /> : index + 1}
                </span>
              ))}
            </div>
            {loyalty.rewardAvailable ? (
              <Alert tone="success">Atendimento gratuito disponível. Para usar, finalize o próximo atendimento com o pagamento “Cortesia”.</Alert>
            ) : (
              <p className="muted">
                A cada {loyalty.target} atendimentos pagos, o próximo é gratuito. Faltam {loyalty.target - loyalty.progress}.
              </p>
            )}
            <p className="muted small">
              {loyalty.eligibleVisits} atendimento(s) válidos · {loyalty.redeemedRewards} cortesia(s) usada(s)
              {client.loyaltyNote && ` · Último ajuste: ${client.loyaltyNote}`}
            </p>
          </div>
          <details className="details">
            <summary>Corrigir contagem manualmente</summary>
            <div className="form-grid">
              <TextField label="Total de atendimentos válidos" type="number" min={0} value={adjust.targetCount} onChange={(event) => setAdjust({ ...adjust, targetCount: event.target.value })} />
              <TextField label="Motivo do ajuste" placeholder="Ex.: atendimentos da agenda antiga" maxLength={240} value={adjust.note} onChange={(event) => setAdjust({ ...adjust, note: event.target.value })} />
            </div>
            <Button variant="secondary" className="button--fit" loading={busy} disabled={!adjust.note.trim()} onClick={saveLoyalty}>
              Salvar ajuste
            </Button>
          </details>
        </fieldset>
      </div>
    </Modal>
  );
}

type Candidate = ContactCandidate & { selected: boolean };

function ImportModal({ onClose }: { onClose: () => void }) {
  const { busy, run } = useAction();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [message, setMessage] = useState("");
  const pickerAvailable = typeof navigator !== "undefined" && "contacts" in navigator;

  function review(contacts: ContactCandidate[]) {
    setCandidates(contacts.map((contact) => ({ ...contact, selected: true })));
    setMessage(contacts.length ? "" : "Nenhum contato com nome e telefone (com DDD) foi encontrado.");
  }

  async function readFile(file: File) {
    review(parseContactsFile(file.name, await file.text()));
  }

  async function pickFromPhone() {
    type PickedContact = { name?: string[]; tel?: string[] };
    const contacts = (navigator as Navigator & { contacts: { select: (fields: string[], options: { multiple: boolean }) => Promise<PickedContact[]> } }).contacts;
    try {
      const picked = await contacts.select(["name", "tel"], { multiple: true });
      review(picked.map((item) => ({ name: item.name?.[0] ?? "", phone: item.tel?.[0] ?? "" })).filter((item) => item.name && item.phone));
    } catch (error) {
      if ((error as Error).name !== "AbortError") setMessage("O celular não liberou os contatos. Use a opção de arquivo.");
    }
  }

  const chosen = candidates.filter((item) => item.selected);

  async function submit() {
    const result = await run(
      () => api<{ imported: number; created: number }>("/api/clients/import", { method: "POST", body: { contacts: chosen.map(({ name, phone }) => ({ name, phone })) } }),
      { refresh: REFRESH.clients },
    );
    if (result) {
      setMessage(`${result.imported} contato(s) importado(s): ${result.created} novo(s) e ${result.imported - result.created} atualizado(s).`);
      setCandidates([]);
    }
  }

  return (
    <Modal
      open
      size="lg"
      title="Importar contatos"
      description="Escolha os contatos no celular ou envie um arquivo CSV/VCF. Nada é salvo antes da sua confirmação."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
          <Button loading={busy} disabled={!chosen.length} onClick={submit}>
            Importar {chosen.length || ""}
          </Button>
        </>
      }
    >
      <div className="form-sections">
        <div className="button-row">
          {pickerAvailable && (
            <Button variant="secondary" icon="users" onClick={pickFromPhone}>
              Selecionar do celular
            </Button>
          )}
          <label className="button button--secondary button--md file-input">
            <Icon name="upload" size={18} />
            <span>Carregar arquivo</span>
            <input type="file" accept=".csv,.txt,.vcf,text/csv,text/vcard" onChange={(event) => event.target.files?.[0] && readFile(event.target.files[0])} />
          </label>
        </div>
        {message && <Alert tone="info">{message}</Alert>}
        {candidates.length > 0 && (
          <div className="contact-review">
            <div className="contact-review__head">
              <strong>{chosen.length} de {candidates.length} selecionado(s)</strong>
              <Button variant="ghost" size="sm" onClick={() => setCandidates(candidates.map((item) => ({ ...item, selected: chosen.length !== candidates.length })))}>
                {chosen.length === candidates.length ? "Desmarcar todos" : "Marcar todos"}
              </Button>
            </div>
            <ul>
              {candidates.map((item, index) => (
                <li key={`${item.phone}-${index}`}>
                  <CheckboxField
                    label={
                      <>
                        <strong>{item.name}</strong> <span className="muted">{formatPhone(item.phone)}</span>
                      </>
                    }
                    checked={item.selected}
                    onChange={(event) => setCandidates(candidates.map((current, position) => (position === index ? { ...current, selected: event.target.checked } : current)))}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
