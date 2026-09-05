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
        <section className="public-hero">
          <div className="public-hero-copy">
            <div className="login-brand">
              <img src="/brand/yuri-barbershop-logo.png" alt="Yuri Barbershop" />
              <span>ESTILO • CONFIANÇA • ATITUDE</span>
            </div>
            <span className="eyebrow">ATENDIMENTO ONLINE</span>
            <h1>Seu próximo visual começa aqui.</h1>
            <p>Escolha o serviço, o profissional, a data e o horário. Envie sua solicitação em poucos passos.</p>
            <div className="public-hero-actions">
              <a className="primary-button" href="#agendamento">Agendar meu horário →</a>
              <a className="public-secondary-link" href="#acesso-equipe">Acesso administrativo</a>
            </div>
            <small className="public-confirmation-note">Seu pedido é registrado e confirmado pessoalmente pelo WhatsApp.</small>
          </div>
        </section>
        <section className="public-booking-section" id="agendamento" aria-labelledby="agendamento-title">
          <div className="public-section-heading">
            <span className="eyebrow">AGENDAMENTO PÚBLICO</span>
            <h2 id="agendamento-title">Agende sem criar uma conta</h2>
            <p>Informe seus dados no final e aguarde a confirmação do horário pelo WhatsApp.</p>
          </div>
          <div className="booking-with-ads" />
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
