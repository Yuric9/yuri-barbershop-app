import AdminApp from "../components/admin/admin-app";
import LoginScreen from "../components/auth/login-screen";
import { getCurrentUser, isAdmin } from "../lib/server/auth";

export const dynamic = "force-dynamic";

/** O sistema é exclusivo da administração: sem login, mostra a tela de acesso. */
export default async function Home() {
  const user = await getCurrentUser();
  if (isAdmin(user)) return <AdminApp user={{ name: user.name, email: user.email }} />;
  return <LoginScreen notice={user ? "Esta conta não tem acesso administrativo." : undefined} />;
}
