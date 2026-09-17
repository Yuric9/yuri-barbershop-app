import { getChatGPTUser } from "./chatgpt-auth";
import PortalClient from "./portal-client";
import PublicBooking from "./public-booking";
import { isAdminEmail } from "./admin-access";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();

  // Entrada pública do MVP: o cliente não precisa de login para solicitar horário.
  if (!user) return <PublicBooking />;

  return (
    <PortalClient
      user={{ name: user.displayName, email: user.email }}
      role={
        user.role === "admin" || isAdminEmail(user.email)
          ? "admin"
          : user.role === "barber"
            ? "barber"
            : "client"
      }
    />
  );
}
