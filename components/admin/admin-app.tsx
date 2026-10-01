"use client";

import { Fragment, useCallback, useEffect, useState, useSyncExternalStore, type ComponentType } from "react";
import { api } from "../../lib/client/api";
import { formatLongDate, todayKey } from "../../lib/domain/dates";
import { FeedbackProvider } from "../ui/feedback-provider";
import { Icon, type IconName } from "../ui/icon";
import { Avatar } from "../ui/layout";
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

type SectionDefinition = { id: SectionId; label: string; icon: IconName; group: string; component: ComponentType<SectionProps> };

const SECTIONS: SectionDefinition[] = [
  { id: "inicio", label: "Início", icon: "home", group: "Visão geral", component: DashboardSection },
  { id: "agenda", label: "Agenda", icon: "calendar", group: "Operação", component: AgendaSection },
  { id: "caixa", label: "Caixa", icon: "cash", group: "Operação", component: CashSection },
  { id: "clientes", label: "Clientes", icon: "users", group: "Relacionamento", component: ClientsSection },
  { id: "remarketing", label: "Remarketing", icon: "megaphone", group: "Relacionamento", component: MarketingSection },
  { id: "servicos", label: "Serviços", icon: "scissors", group: "Cadastros", component: ServicesSection },
  { id: "produtos", label: "Produtos", icon: "box", group: "Cadastros", component: ProductsSection },
  { id: "equipe", label: "Equipe", icon: "team", group: "Cadastros", component: TeamSection },
  { id: "relatorios", label: "Relatórios", icon: "chart", group: "Financeiro", component: ReportsSection },
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

/** Painel administrativo: menu lateral + a seção ativa (guardada na URL, ex.: `/#agenda`). */
export default function AdminApp({ user }: { user: { name: string; email: string } }) {
  const active = useSyncExternalStore(subscribeToHash, sectionFromHash, () => DEFAULT_SECTION);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [today, setToday] = useState("");

  useEffect(() => {
    // Data calculada no navegador para evitar diferença entre servidor e cliente.
    const timer = window.setTimeout(() => setToday(formatLongDate(todayKey())), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const navigate = useCallback((section: SectionId) => {
    window.location.hash = section;
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }, []);

  async function logout() {
    setLoggingOut(true);
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.assign("/");
  }

  const current = SECTIONS.find((section) => section.id === active) ?? SECTIONS[0];
  const Section = current.component;

  return (
    <FeedbackProvider>
      <div className={`app ${menuOpen ? "app--menu-open" : ""}`}>
        <aside className="sidebar" id="menu-principal">
          <div className="sidebar__brand">
            <img src="/brand/yuri-barbershop-logo.png" alt="" width={44} height={44} />
            <div>
              <strong>Yuri Barbershop</strong>
              <span>Gestão</span>
            </div>
            <button type="button" className="sidebar__close" aria-label="Fechar menu" onClick={() => setMenuOpen(false)}>
              <Icon name="close" />
            </button>
          </div>

          <nav aria-label="Menu principal" className="sidebar__nav">
            {SECTIONS.map((section, index) => (
              <Fragment key={section.id}>
                {SECTIONS[index - 1]?.group !== section.group && <span className="sidebar__group">{section.group}</span>}
                <a
                  href={`#${section.id}`}
                  className={section.id === active ? "is-active" : ""}
                  aria-current={section.id === active ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
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

        <button type="button" className="app__backdrop" aria-label="Fechar menu" tabIndex={-1} onClick={() => setMenuOpen(false)} />

        <div className="app__main">
          <header className="topbar">
            <button
              type="button"
              className="topbar__menu"
              onClick={() => setMenuOpen((open) => !open)}
              aria-controls="menu-principal"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            >
              <Icon name={menuOpen ? "close" : "menu"} />
            </button>
            <div className="topbar__title">
              <span>{today}</span>
              <h1>{current.label}</h1>
            </div>
          </header>

          <main className="content" id="conteudo">
            <Section key={current.id} navigate={navigate} user={user} />
          </main>
        </div>
      </div>
    </FeedbackProvider>
  );
}
