"use client";

import { useMemo, useState } from "react";
import { api, useApi } from "../../../lib/client/api";
import { REFRESH } from "../../../lib/client/refresh";
import { useClients } from "../../../lib/client/resources";
import type { ClientSummary, MarketingContact } from "../../../lib/client/types";
import { useAction } from "../../../lib/client/use-action";
import { formatDate, todayKey } from "../../../lib/domain/dates";
import { whatsappLink } from "../../../lib/domain/phone";
import { Button } from "../../ui/button";
import { AsyncContent, EmptyState } from "../../ui/feedback";
import { SelectField } from "../../ui/field";
import { Icon } from "../../ui/icon";
import { Avatar, Badge, Metric, MetricGrid, PageHeader, Tabs } from "../../ui/layout";

const GOOGLE_REVIEW_URL = "https://g.page/r/CaO2Z7is9bPgEAE/review";
const INSTAGRAM = "@yuricbarbearia";

type Campaign = "pos" | "retorno" | "aniversario" | "fidelidade" | "indicacao";

const firstName = (client: ClientSummary) => client.name.split(" ")[0];

/** Campanhas: quem entra em cada lista e qual mensagem enviar. */
const CAMPAIGNS: Record<Campaign, { label: string; description: string; message: (client: ClientSummary) => string }> = {
  pos: {
    label: "Pós-atendimento",
    description: "Clientes atendidos nos últimos 7 dias: peça uma avaliação no Google.",
    message: (client) =>
      `Olá, ${firstName(client)}! Tudo bem? ✂️\n\nObrigado por escolher a Yuri Barbershop! Como foi seu atendimento de ${client.lastService ?? "hoje"}?\n\n⭐ Avalie a gente no Google:\n${GOOGLE_REVIEW_URL}\n\n📸 Se postar o resultado, marque ${INSTAGRAM}!`,
  },
  retorno: {
    label: "Retorno",
    description: "Clientes sem atendimento há algum tempo.",
    message: (client) =>
      `Olá, ${firstName(client)}! Tudo bem? Já faz ${client.daysSinceLastVisit} dias desde seu último atendimento na Yuri Barbershop. Que tal cuidarmos do visual de novo? Me chama aqui para combinarmos o horário. ✂️`,
  },
  aniversario: {
    label: "Aniversariantes",
    description: "Clientes que fazem aniversário neste mês.",
    message: (client) => `Olá, ${firstName(client)}! O seu mês chegou! 🎉 A Yuri Barbershop deseja um feliz aniversário. Tem um presente especial esperando por você — fale comigo para agendar!`,
  },
  fidelidade: {
    label: "Fidelidade",
    description: "Clientes perto de completar o cartão fidelidade ou com cortesia disponível.",
    message: (client) =>
      client.loyalty.rewardAvailable
        ? `Olá, ${firstName(client)}! Seu cartão fidelidade está completo e você já tem um atendimento gratuito disponível. Vamos agendar? ⭐`
        : `Olá, ${firstName(client)}! Faltam só ${client.loyalty.target - client.loyalty.progress} atendimento(s) para você ganhar um serviço grátis no cartão fidelidade. Vamos agendar o próximo? ⭐`,
  },
  indicacao: {
    label: "Indique um amigo",
    description: "Todos os clientes com telefone.",
    message: (client) => `Olá, ${firstName(client)}! Que tal indicar um amigo para conhecer a Yuri Barbershop? Quando ele fizer o primeiro atendimento, vocês dois ganham um benefício especial. ✂️`,
  },
};

export default function MarketingSection() {
  const clients = useClients();
  const contacts = useApi<{ contacts: MarketingContact[] }>("/api/marketing-contacts");
  const [campaign, setCampaign] = useState<Campaign>("pos");
  const [inactiveDays, setInactiveDays] = useState(30);
  const today = todayKey();

  const lists = useMemo(() => {
    const all = (clients.data?.clients ?? []).filter((client) => client.phone);
    const month = today.slice(5, 7);
    return {
      pos: all.filter((client) => client.lastStatus === "Finalizado" && client.daysSinceLastVisit !== null && client.daysSinceLastVisit <= 7),
      retorno: all
        .filter((client) => client.daysSinceLastVisit !== null && client.daysSinceLastVisit >= inactiveDays)
        .sort((a, b) => (b.daysSinceLastVisit ?? 0) - (a.daysSinceLastVisit ?? 0)),
      aniversario: all.filter((client) => client.birthDate.slice(5, 7) === month).sort((a, b) => a.birthDate.slice(8).localeCompare(b.birthDate.slice(8))),
      fidelidade: all.filter((client) => client.loyalty.rewardAvailable || client.loyalty.progress >= client.loyalty.target - 2),
      indicacao: all,
    } satisfies Record<Campaign, ClientSummary[]>;
  }, [clients.data, inactiveDays, today]);

  const contactMap = useMemo(() => new Map((contacts.data?.contacts ?? []).map((contact) => [contact.key, contact])), [contacts.data]);
  const sent = contacts.data?.contacts.filter((contact) => contact.sentAt).length ?? 0;
  const answered = contacts.data?.contacts.filter((contact) => contact.answered).length ?? 0;
  const returned = contacts.data?.contacts.filter((contact) => contact.returned).length ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Relacionamento"
        title="Remarketing"
        description="Listas prontas de clientes com mensagens para o WhatsApp e acompanhamento dos resultados."
        actions={
          <a className="button button--secondary button--md" href="https://app.brevo.com/campaign/list" target="_blank" rel="noreferrer noopener">
            <Icon name="external" size={18} />
            <span>Campanhas de e-mail (Brevo)</span>
          </a>
        }
      />

      <AsyncContent {...clients} onRetry={clients.reload}>
        {() => {
          const definition = CAMPAIGNS[campaign];
          const list = lists[campaign];
          return (
            <div className="stack">
              <MetricGrid>
                <Metric label="Mensagens enviadas" value={sent} />
                <Metric label="Respostas" value={answered} />
                <Metric label="Clientes que voltaram" value={returned} />
                <Metric highlight label="Conversão" value={`${sent ? Math.round((returned / sent) * 100) : 0}%`} hint="Voltaram ÷ enviadas" />
              </MetricGrid>

              <Tabs
                label="Campanhas"
                value={campaign}
                onChange={setCampaign}
                items={(Object.keys(CAMPAIGNS) as Campaign[]).map((key) => ({ value: key, label: CAMPAIGNS[key].label, count: lists[key].length }))}
              />

              <div className="toolbar">
                <p className="muted">{definition.description}</p>
                {campaign === "retorno" && (
                  <SelectField label="Sem atendimento há" value={inactiveDays} onChange={(event) => setInactiveDays(Number(event.target.value))}>
                    {[15, 30, 60, 90].map((days) => (
                      <option key={days} value={days}>
                        {days} dias ou mais
                      </option>
                    ))}
                  </SelectField>
                )}
              </div>

              {list.length ? (
                <ul className="card-grid">
                  {list.map((client) => {
                    const key = `${campaign}-${client.email}-${client.lastVisit ?? "novo"}`;
                    return <CampaignCard key={key} contactKey={key} campaign={campaign} client={client} contact={contactMap.get(key)} message={definition.message(client)} />;
                  })}
                </ul>
              ) : (
                <EmptyState icon="check" title="Nenhum cliente nesta campanha">
                  Os clientes aparecem aqui automaticamente quando se encaixam no critério.
                </EmptyState>
              )}
            </div>
          );
        }}
      </AsyncContent>
    </>
  );
}

function CampaignCard({ contactKey, campaign, client, contact, message }: { contactKey: string; campaign: Campaign; client: ClientSummary; contact?: MarketingContact; message: string }) {
  const { run } = useAction();

  const save = (change: Partial<Pick<MarketingContact, "sentAt" | "answered" | "returned">>) =>
    run(
      () =>
        api("/api/marketing-contacts", {
          method: "PUT",
          body: {
            key: contactKey,
            clientEmail: client.email,
            campaign,
            sentAt: contact?.sentAt ?? "",
            answered: contact?.answered ?? false,
            returned: contact?.returned ?? false,
            ...change,
          },
        }),
      { refresh: REFRESH.marketing },
    );

  const detail =
    campaign === "aniversario"
      ? `Aniversário: ${formatDate(client.birthDate).slice(0, 5)}`
      : campaign === "fidelidade"
        ? `Cartão: ${client.loyalty.progress}/${client.loyalty.target}`
        : client.lastVisit
          ? `Último atendimento: ${formatDate(client.lastVisit)} · ${client.lastService}`
          : "Ainda sem atendimentos";

  return (
    <li className={`campaign-card ${contact?.sentAt ? "is-sent" : ""}`}>
      <header>
        <Avatar name={client.name} size="sm" />
        <div>
          <strong>{client.name}</strong>
          <small>{detail}</small>
        </div>
        {contact?.sentAt && <Badge tone="success">Enviada {formatDate(contact.sentAt.slice(0, 10)).slice(0, 5)}</Badge>}
      </header>
      <footer>
        <a
          className="button button--primary button--sm"
          href={whatsappLink(client.phone, message)}
          target="_blank"
          rel="noreferrer"
          onClick={() => void save({ sentAt: new Date().toISOString() })}
        >
          <Icon name="whatsapp" size={16} />
          <span>Enviar WhatsApp</span>
        </a>
        {contact?.sentAt && (
          <>
            <Button variant={contact.answered ? "secondary" : "ghost"} size="sm" aria-pressed={contact.answered} onClick={() => save({ answered: !contact.answered })}>
              {contact.answered ? "✓ Respondeu" : "Respondeu"}
            </Button>
            <Button variant={contact.returned ? "secondary" : "ghost"} size="sm" aria-pressed={contact.returned} onClick={() => save({ returned: !contact.returned })}>
              {contact.returned ? "✓ Voltou" : "Voltou"}
            </Button>
          </>
        )}
      </footer>
    </li>
  );
}
