import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  appointments,
  businessSettings,
  catalogItems,
  collaborators,
  products,
  profiles,
  promotions,
  services,
  subscriptions,
} from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

function unauthorized() {
  return Response.json({ error: "Não autorizado" }, { status: 401 });
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();

  const db = getDb();

  const [
    serviceRows,
    productRows,
    catalogRows,
    promotionRows,
    subscriptionRows,
    appointmentRows,
    settingsRows,
    collaboratorRows,
    profileRows,
  ] = await Promise.all([
    db.select().from(services).where(eq(services.active, true)),
    db.select().from(products).where(eq(products.active, true)),
    db.select().from(catalogItems).where(eq(catalogItems.active, true)).orderBy(desc(catalogItems.id)),
    db.select().from(promotions).where(eq(promotions.active, true)).orderBy(desc(promotions.id)),
    db.select().from(subscriptions).where(eq(subscriptions.clientEmail, user.email)).orderBy(desc(subscriptions.id)),
    db.select().from(appointments).where(eq(appointments.clientEmail, user.email)).orderBy(desc(appointments.date)),
    db.select().from(businessSettings).limit(1),
    db.select().from(collaborators).where(eq(collaborators.active, true)).orderBy(collaborators.name),
    db.select().from(profiles).where(eq(profiles.email, user.email)),
  ]);

  const settings = settingsRows[0] || {
    loyaltyTarget: 10,
    loyaltyReward: "1 atendimento grátis",
  };

  return Response.json({
    services: serviceRows,
    products: productRows,
    catalogItems: catalogRows,
    promotions: promotionRows,
    subscriptions: subscriptionRows,
    appointments: appointmentRows,
    settings: {
      loyaltyTarget: settings.loyaltyTarget,
      loyaltyReward: settings.loyaltyReward,
    },
    collaborators: collaboratorRows.map((item) => ({
      id: item.id,
      name: item.name,
      active: item.active,
    })),
    profiles: profileRows,
  });
}
