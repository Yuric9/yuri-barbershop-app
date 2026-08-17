import { cookies } from "next/headers";
import { deleteSession, SESSION_COOKIE } from "../../../session-auth";
import { rejectCrossSiteWrite } from "../../../request-security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const originError = rejectCrossSiteWrite(request);
  if (originError) return originError;

  const store = await cookies();
  await deleteSession(store.get(SESSION_COOKIE)?.value);
  store.set(SESSION_COOKIE, "", { httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "lax", path: "/", maxAge: 0 });
  return Response.redirect(new URL("/", request.url), 303);
}
