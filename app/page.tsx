import { getChatGPTUser } from "./chatgpt-auth";
import PortalClient from "./portal-client";
import { isAdminEmail } from "./admin-access";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();

  // O MVP precisa permitir que o cliente comece pelo celular sem login.
  // O PortalClient em modo demo usa apenas dados públicos e não cria registros
  // autenticados; a confirmação real segue o fluxo definido no próprio portal.
  if (!user) {
    return (
      <PortalClient
        user={{ name: "Visitante", email: "" }}
        role="client"
        demo
      />
    );
  }

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
