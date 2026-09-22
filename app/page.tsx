import { getChatGPTUser } from "./chatgpt-auth";
import PortalClient from "./portal-client";
import { isAdminEmail } from "./admin-access";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();

  if (!user) {
    return (
      <main className="landing-shell public-landing">
        <header className="public-header">
          <a className="public-header-brand" href="/" aria-label="Yuri Barbershop — início">
            <img src="/brand/yuri-barbershop-logo.png" alt="Yuri Barbershop" />
          </a>
          <a className="public-admin-link" href="/acesso-administrativo">
            Acesso administrativo
          </a>
        </header>

        <section className="public-home-hero" aria-labelledby="public-home-title">
          <span className="public-home-eyebrow">BEM-VINDO À</span>
          <h1 id="public-home-title">YURI <strong>BARBERSHOP</strong></h1>

          <div className="public-home-actions" aria-label="Escolha uma opção">
            <a className="public-home-action" href="/agendamentos">
              <span className="public-home-action-icon" aria-hidden="true">◫</span>
              <span className="public-home-action-copy">
                <strong>Agendamentos</strong>
                <small>Escolha seu serviço e horário</small>
              </span>
              <span className="public-home-action-arrow" aria-hidden="true">→</span>
            </a>

            <a className="public-home-action" href="/produtos">
              <span className="public-home-action-icon" aria-hidden="true">◇</span>
              <span className="public-home-action-copy">
                <strong>Produtos</strong>
                <small>Conheça nossos produtos</small>
              </span>
              <span className="public-home-action-arrow" aria-hidden="true">→</span>
            </a>
          </div>
        </section>

        <footer className="public-home-footer">
          <span>Segunda a sexta: 18h às 20h30</span>
          <span>Sábado: 8h às 20h30 · Domingo: 8h às 12h</span>
          <a href="/privacidade">Privacidade e proteção de dados</a>
        </footer>
      </main>
    );
  }

  return <PortalClient user={{ name: user.displayName, email: user.email }} role={user.role === "admin" || isAdminEmail(user.email) ? "admin" : user.role === "barber" ? "barber" : "client"} />;
}
