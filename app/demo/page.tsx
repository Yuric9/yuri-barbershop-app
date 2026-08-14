import PortalClient from "../portal-client";

export default function Demo() {
  return <PortalClient user={{ name: "Visitante", email: "" }} role="client" demo />;
}
