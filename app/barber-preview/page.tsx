import { redirect } from "next/navigation";
import { getChatGPTUser } from "../chatgpt-auth";
import { isAdminEmail } from "../admin-access";
import BarberPreviewClient from "../barber-preview-client";

export const dynamic = "force-dynamic";

export default async function BarberPreviewPage() {
  const user = await getChatGPTUser();
  if (!user) redirect("/");
  if (user.role !== "admin" && !isAdminEmail(user.email)) redirect("/");
  return <BarberPreviewClient />;
}
