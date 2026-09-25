import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AgendamentosPage() {
  redirect("/acesso-administrativo");
}
