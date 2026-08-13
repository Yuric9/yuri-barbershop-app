import PortalClient from "../../portal-client";

export default function AdminDemo() {
  return <PortalClient user={{ name: "Yuri César", email: "jesika.yure@gmail.com" }} role="admin" demo />;
}
