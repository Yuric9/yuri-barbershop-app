import PortalClient from "../portal-client";

export default function Demo() {
  return <PortalClient user={{ name: "João Cliente", email: "cliente@exemplo.com" }} role="client" demo />;
}
