import { chatGPTSignInPath, getChatGPTUser } from "./chatgpt-auth";
import PortalClient from "./portal-client";
import { isAdminEmail } from "./admin-access";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { products, promotions, subscriptionCampaigns } from "../db/schema";
import LoginCampaignPopup from "./login-campaign-popup";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();

  if (!user) {
    let campaign:any=null;
    try {
      const db=getDb();
      const promo=await db.select().from(promotions).where(eq(promotions.showOnLogin,true)).orderBy(desc(promotions.id)).limit(1);
      const club=await db.select().from(subscriptionCampaigns).where(eq(subscriptionCampaigns.showOnLogin,true)).orderBy(desc(subscriptionCampaigns.id)).limit(1);
      const product=await db.select().from(products).where(eq(products.showOnLogin,true)).orderBy(desc(products.id)).limit(1);
      campaign=promo[0]?{...promo[0],kind:"promotion"}:club[0]?{...club[0],kind:"subscription"}:product[0]?{...product[0],title:product[0].name,kind:"product",description:`${product[0].description} • R$ ${(product[0].priceCents/100).toFixed(2).replace(".",",")}`}:null;
    } catch {}
    return (
      <main className="landing-shell login-landing">
        <LoginCampaignPopup campaign={campaign}/>
        <div className="landing-orb orb-one" />
        <div className="landing-orb orb-two" />
        <section className="login-stage">
          <div className="login-brand">
            <img src="/brand/yuri-barbershop-logo.png" alt="Yuri Barbershop" />
            <span>ESTILO • CONFIANÇA • ATITUDE</span>
          </div>
          <div className="access-box login-card" id="acesso">
            <span className="eyebrow">BEM-VINDO</span>
            <h1>Acesse a Yuri Barbershop</h1>
            <p>Entre para agendar serviços, acompanhar seus horários e conhecer nossas novidades.</p>
            <a className="primary-button access-client" href={chatGPTSignInPath("/")}><span>♙</span><div><strong>Entrar como cliente</strong><small>Agendar e consultar horários</small></div></a>
            <a className="access-admin" href={chatGPTSignInPath("/")}><span>◇</span><div><strong>Entrar como administrador</strong><small>Acesso exclusivo à gestão</small></div></a>
            <div className="login-help"><b>Horários de atendimento</b><span>Segunda a sexta: 18h às 20h30</span><span>Sábado: 8h às 20h30 • Domingo: 8h às 12h</span><small>Os agendamentos aguardam confirmação pelo WhatsApp.</small></div>
            <a className="privacy-link" href="/privacidade">Privacidade e proteção de dados</a>
          </div>
        </section>
      </main>
    );
  }

  return <PortalClient user={{ name: user.displayName, email: user.email }} role={isAdminEmail(user.email) ? "admin" : "client"} />;
}
