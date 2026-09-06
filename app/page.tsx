import { getChatGPTUser } from "./chatgpt-auth";
import PortalClient from "./portal-client";
import { isAdminEmail } from "./admin-access";
import LoginPanel from "./login-panel";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();

  if (!user) {
    return (
      <main className="landing-shell public-landing">
        <div className="landing-orb orb-one" />
        <div className="landing-orb orb-two" />
        <header className="public-header">
          <div className="public-header-brand">
            <img src="/brand/yuri-barbershop-logo.png" alt="Yuri Barbershop" />
            <span>YURI BARBERSHOP</span>
          </div>
          <a className="public-admin-link" href="#acesso-equipe">Acesso administrativo</a>
        </header>
        <section className="public-booking-section" id="agendamento" aria-labelledby="agendamento-title">
          <div className="public-section-heading">
            <span className="eyebrow">ATENDIMENTO ONLINE</span>
            <h1 id="agendamento-title">Agende seu horário</h1>
            <p>Escolha seu serviço e envie a solicitação. A confirmação acontece pelo WhatsApp.</p>
          </div>
          <div className="booking-with-ads" />
          <div className="public-booking-meta">
            <span>Segunda a sexta: 18h às 20h30</span>
            <span>Sábado: 8h às 20h30 · Domingo: 8h às 12h</span>
            <a href="/privacidade">Privacidade e proteção de dados</a>
          </div>
        </section>
        <section className="public-access-section" id="acesso-equipe" aria-labelledby="acesso-equipe-title">
          <div className="public-section-heading">
            <span className="eyebrow">ÁREA RESTRITA</span>
            <h2 id="acesso-equipe-title">Acesso administrativo</h2>
            <p>Entre com seu acesso cadastrado para abrir a área correspondente ao seu perfil.</p>
          </div>
          <LoginPanel />
        </section>
      </main>
    );
  }

  return <PortalClient user={{ name: user.displayName, email: user.email }} role={user.role === "admin" || isAdminEmail(user.email) ? "admin" : user.role === "barber" ? "barber" : "client"} />;
}
