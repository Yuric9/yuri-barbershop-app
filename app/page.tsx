import { getChatGPTUser } from "./chatgpt-auth";
import PortalClient from "./portal-client";
import { isAdminEmail } from "./admin-access";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { products, subscriptionCampaigns } from "../db/schema";
import LoginCampaignPopup from "./login-campaign-popup";
import LoginPanel from "./login-panel";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();

  if (!user) {
    let campaign:any=null;
    try {
      const db=getDb();
      const club=await db.select().from(subscriptionCampaigns).where(eq(subscriptionCampaigns.showOnLogin,true)).orderBy(desc(subscriptionCampaigns.id)).limit(1);
      const product=await db.select().from(products).where(eq(products.showOnLogin,true)).orderBy(desc(products.id)).limit(1);
      campaign=club[0]?{...club[0],kind:"subscription"}:product[0]?{...product[0],title:product[0].name,kind:"product",description:`${product[0].description} • R$ ${(product[0].priceCents/100).toFixed(2).replace(".",",")}`}:null;
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
          <LoginPanel />
        </section>
      </main>
    );
  }

  return <PortalClient user={{ name: user.displayName, email: user.email }} role={user.role === "admin" || isAdminEmail(user.email) ? "admin" : user.role === "barber" ? "barber" : "client"} />;
}
