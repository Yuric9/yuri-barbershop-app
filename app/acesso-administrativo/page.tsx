import Link from "next/link";
import LoginPanel from "../login-panel";

export const dynamic = "force-dynamic";

export default function AdministrativeAccessPage() {
  return (
    <main className="landing-shell public-landing administrative-access-page">
      <header className="public-header">
        <div className="public-header-brand">
          <img src="/brand/yuri-barbershop-logo.png" alt="Yuri Barbershop" />
          <span>YURI BARBERSHOP</span>
        </div>
        <Link className="public-admin-link" href="/">
          Voltar ao agendamento
        </Link>
      </header>
      <section className="public-access-section" aria-labelledby="acesso-administrativo-title">
        <div className="public-section-heading">
          <span className="eyebrow">ÁREA RESTRITA</span>
          <h1 id="acesso-administrativo-title">Acesso administrativo</h1>
          <p>Entre com seu acesso cadastrado para abrir a área correspondente ao seu perfil.</p>
        </div>
        <LoginPanel />
      </section>
    </main>
  );
}
