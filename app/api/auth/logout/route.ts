import { rejectCrossSiteWrite } from "../../../../lib/server/request-security";
import { endSession } from "../../../../lib/server/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const crossSite = rejectCrossSiteWrite(request);
  if (crossSite) return crossSite;
  await endSession(new URL(request.url).protocol === "https:");
  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
