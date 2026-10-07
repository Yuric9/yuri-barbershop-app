"use client";

import { Fragment, useCallback, useEffect, useState, useSyncExternalStore, type ComponentType } from "react";
import { api } from "../../lib/client/api";
import { formatLongDate, todayKey } from "../../lib/domain/dates";
import { FeedbackProvider } from "../ui/feedback-provider";
import { Icon, type IconName } from "../ui/icon";
import { Button } from "../ui/button";
import { Avatar } from "../ui/layout";
import { Modal } from "../ui/modal";
import AgendaSection from "./sections/agenda";
import CashSection from "./sections/cash";
import ClientsSection from "./sections/clients";
import DashboardSection from "./sections/dashboard";
import MarketingSection from "./sections/marketing";
import ProductsSection from "./sections/products";
import ReportsSection from "./sections/reports";
import ServicesSection from "./sections/services";
import TeamSection from "./sections/team";

export type SectionId = "inicio" | "agenda" | "caixa" | "clientes" | "equipe" | "servicos" | "produtos" | "relatorios" | "remarketing";

export type SectionProps = { navigate: (section: SectionId) => void; user: { name: string; email: string } };

type SectionDefinition = {
  id: SectionId;
  label: string;
  icon: IconName;
  group: string;
  /** Aparece direto na barra de abas do celular (as demais ficam em "Mais"). */
  tab?: boolean;
  component: ComponentType<SectionProps>;
};

const SECTIONS: SectionDefinition[] = [
  { id: "inicio", label: "Início", icon: "home", group: "Visão geral", tab: true, component: DashboardSection },
  { id: "caixa", label: "Caixa", icon: "cash", group: "Financeiro", tab: true, component: CashSection },
  { id: "relatorios", label: "Relatórios", icon: "chart", group: "Financeiro", tab: true, component: ReportsSection },
  { id: "clientes", label: "Clientes", icon: "users", group: "Clientes", tab: true, component: ClientsSection },
  { id: "remarketing", label: "Remarketing", icon: "megaphone", group: "Clientes", component: MarketingSection },
  { id: "servicos", label: "Serviços", icon: "scissors", group: "Cadastros", component: ServicesSection },
  { id: "produtos", label: "Produtos", icon: "box", group: "Cadastros", component: ProductsSection },
  { id: "equipe", label: "Equipe", icon: "team", group: "Cadastros", component: TeamSection },
  { id: "agenda", label: "Agenda", icon: "calendar", group: "Agendamentos", component: AgendaSection },
];

const DEFAULT_SECTION: SectionId = "inicio";

function sectionFromHash(): SectionId {
  const id = window.location.hash.slice(1);
  return SECTIONS.some((section) => section.id === id) ? (id as SectionId) : DEFAULT_SECTION;
}

function subscribeToHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

/**
 * Painel administrativo. A seção ativa fica na URL (ex.: `/#agenda`).
 * - Computador: menu lateral fixo.
 * - Celular/tablet: barra de abas embaixo, como um aplicativo; as telas menos
 *   usadas ficam na folha "Mais".
 */
export default function AdminApp({ user }: { user: { name: string; email: string } }) {
  const active = useSyncExternalStore(subscribeToHash, sectionFromHash, () => DEFAULT_SECTION);
  const [moreOpen, setMoreOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [today, setToday] = useState("");

  useEffect(() => {
    // Data calculada no navegador para evitar diferença entre servidor e cliente.
    const timer = window.setTimeout(() => setToday(formatLongDate(todayKey())), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const navigate = useCallback((section: SectionId) => {
    window.location.hash = section;
    setMoreOpen(false);
    window.scrollTo({ top: 0 });
  }, []);

  async function logout() {
    setLoggingOut(true);
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.assign("/");
  }

  const current = SECTIONS.find((section) => section.id === active) ?? SECTIONS[0];
  const Section = current.component;
  const tabs = SECTIONS.filter((section) => section.tab);
  const moreSections = SECTIONS.filter((section) => !section.tab);
  const moreActive = !current.tab;

  return (
    <FeedbackProvider>
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar__brand">
            <img src="/brand/logo-176.webp" alt="" width={44} height={44} />
            <div>
              <strong>Yuri Barbershop</strong>
              <span>Gestão</span>
            </div>
          </div>

          <nav aria-label="Menu principal" className="sidebar__nav">
            {SECTIONS.map((section, index) => (
              <Fragment key={section.id}>
                {SECTIONS[index - 1]?.group !== section.group && <span className="sidebar__group">{section.group}</span>}
                <a href={`#${section.id}`} className={section.id === active ? "is-active" : ""} aria-current={section.id === active ? "page" : undefined}>
                  <Icon name={section.icon} />
                  {section.label}
                </a>
              </Fragment>
            ))}
          </nav>

          <div className="sidebar__user">
            <Avatar name={user.name} />
            <div>
              <strong>{user.name}</strong>
              <span>Administrador</span>
            </div>
          </div>
          <button type="button" className="sidebar__logout" onClick={logout} disabled={loggingOut}>
            <Icon name="logout" />
            {loggingOut ? "Saindo..." : "Sair"}
          </button>
        </aside>

        <div className="app__main">
          <header className="topbar">
            <img className="topbar__logo" src="/brand/logo-176.webp" alt="" width={36} height={36} />
            <div className="topbar__title">
              <span>{today}</span>
              <h1>{current.label}</h1>
            </div>
            <button type="button" className="topbar__avatar" onClick={() => setMoreOpen(true)} aria-label="Abrir menu da conta">
              <Avatar name={user.name} size="sm" />
            </button>
          </header>

          <main className="content" id="conteudo">
            <div className="screen" key={current.id}>
              <Section navigate={navigate} user={user} />
            </div>
          </main>
        </div>

        <nav className="tabbar" aria-label="Navegação principal">
          {tabs.map((section) => (
            <a key={section.id} href={`#${section.id}`} className={section.id === active ? "is-active" : ""} aria-current={section.id === active ? "page" : undefined}>
              <Icon name={section.icon} size={22} />
              <span>{section.label}</span>
            </a>
          ))}
          <button type="button" className={moreActive ? "is-active" : ""} onClick={() => setMoreOpen(true)} aria-haspopup="dialog">
            <Icon name="grid" size={22} />
            <span>{moreActive ? current.label : "Mais"}</span>
          </button>
        </nav>

        <Modal open={moreOpen} title="Mais opções" onClose={() => setMoreOpen(false)}>
          <div className="more-menu">
            <div className="more-menu__user">
              <Avatar name={user.name} size="lg" />
              <div>
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
            </div>
            <div className="more-menu__grid">
              {moreSections.map((section) => (
                <button key={section.id} type="button" className={section.id === active ? "is-active" : ""} onClick={() => navigate(section.id)}>
                  <span className="more-menu__icon">
                    <Icon name={section.icon} size={22} />
                  </span>
                  {section.label}
                </button>
              ))}
            </div>
            <Button variant="secondary" icon="logout" className="button--block" loading={loggingOut} onClick={logout}>
              Sair da conta
            </Button>
          </div>
        </Modal>
      </div>
    </FeedbackProvider>
  );
}
