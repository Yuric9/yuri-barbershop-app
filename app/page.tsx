import { getChatGPTUser } from "./chatgpt-auth";
import PortalClient from "./portal-client";
import { isAdminEmail } from "./admin-access";
import LoginPanel from "./login-panel";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();

  if (!user) {
    return (
      <main className="landing-shell login-landing">
        <div className="landing-orb orb-one" />
        <div className="landing-orb orb-two" />
        <section className="login-stage">
          <div className="login-brand">
            <img src="/brand/yuri-barbershop-logo.png" alt="Yuri Barbershop" />
            <span>ESTILO • CONFIANÇA • ATITUDE</span>
          </div>
          <LoginPanel />
        </section>
      </main>
    );
  }

  return <PortalClient user={{ name: user.displayName, email: user.email }} role={user.role === "admin" || isAdminEmail(user.email) ? "admin" : user.role === "barber" ? "barber" : "client"} />;
}
