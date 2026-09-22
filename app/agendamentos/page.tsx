import PortalClient from "../portal-client";

export const dynamic = "force-dynamic";

export default function AgendamentosPage() {
  return (
    <PortalClient
      user={{ name: "Visitante", email: "" }}
      role="client"
      demo
      initialSection="agendar"
    />
  );
}
