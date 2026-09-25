import { redirect } from "next/navigation";
import { getChatGPTUser } from "./chatgpt-auth";
import PortalClient from "./portal-client";
import LoginPanel from "./login-panel";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();

  if (user?.role === "admin") {
    return <PortalClient user={{ name: user.displayName, email: user.email }} role="admin" />;
  }

  if (user) {
    return (
      <main className="landing-shell public-landing administrative-access-page">
        <header className="public-header">
          <div className="public-header-brand">
            <img src="/brand/yuri-barbershop-logo.png" alt="Yuri Barbershop" />
            <span>YURI BARBERSHOP</span>
          </div>
          <a className="public-admin-link" href="/api/auth/logout">Sair</a>
        </header>
        <section className="public-access-section" aria-labelledby="acesso-administrativo-title">
          <div className="public-section-heading">
            <span className="eyebrow">ACESSO RESTRITO</span>
            <h1 id="acesso-administrativo-title">Perfil sem acesso administrativo</h1>
            <p>Esta aplicação está configurada para uso administrativo. Entre novamente com uma conta de administrador.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="landing-shell public-landing administrative-access-page">
      <header className="public-header">
        <div className="public-header-brand">
          <img src="/brand/yuri-barbershop-logo.png" alt="Yuri Barbershop" />
          <span>YURI BARBERSHOP</span>
        </div>
      </header>
      <section className="public-access-section" aria-labelledby="acesso-administrativo-title">
        <div className="public-section-heading">
          <span className="eyebrow">SISTEMA PRIVADO</span>
          <h1 id="acesso-administrativo-title">Acesso administrativo</h1>
          <p>Entre com suas credenciais para abrir o painel de gestão da Yuri Barbershop.</p>
        </div>
        <LoginPanel />
      </section>
    </main>
  );
}
