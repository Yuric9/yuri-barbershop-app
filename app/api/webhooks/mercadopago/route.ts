import { NextResponse } from "next/server";
import { mercadoPagoRuntimeConfig } from "../../../runtime-config";
import {
  mercadoPagoRequest,
  syncLocalSubscriptionFromMercadoPago,
  type MercadoPagoPreapproval,
} from "../../../mercadopago-subscriptions";

export const runtime = "edge";

const encoder = new TextEncoder();

function parseSignature(value: string) {
  const parts = Object.fromEntries(
    value
      .split(",")
      .map((part) => part.trim().split("="))
      .filter((entry) => entry.length === 2),
  );
  return { ts: parts.ts || "", v1: parts.v1 || "" };
}

async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

async function validMercadoPagoSignature(request: Request, dataId: string) {
  const { webhookSecret } = mercadoPagoRuntimeConfig();
  if (!webhookSecret) return { ok: false, reason: "webhook_not_configured" } as const;

  const xSignature = request.headers.get("x-signature") || "";
  const xRequestId = request.headers.get("x-request-id") || "";
  if (!xSignature || !xRequestId || !dataId) return { ok: false, reason: "missing_signature_data" } as const;

  const { ts, v1 } = parseSignature(xSignature);
  if (!ts || !v1) return { ok: false, reason: "invalid_signature_header" } as const;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = await hmacSha256Hex(webhookSecret, manifest);
  return constantTimeEqual(expected.toLowerCase(), v1.toLowerCase())
    ? ({ ok: true } as const)
    : ({ ok: false, reason: "signature_mismatch" } as const);
}

function acceptedSubscriptionTopic(type: string) {
  return [
    "subscription_preapproval",
    "subscription_preapproval_plan",
    "subscription_authorized_payment",
  ].includes(type);
}

export async function GET() {
  const config = mercadoPagoRuntimeConfig();
  const configured = Boolean(config.webhookSecret && config.accessToken);
  return NextResponse.json(
    { service: "mercadopago-webhook", ready: configured },
    { status: configured ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const dataId = String(
    url.searchParams.get("data.id") ||
      url.searchParams.get("data_id") ||
      body?.data?.id ||
      "",
  ).trim();
  const type = String(url.searchParams.get("type") || body?.type || "").trim();

  const signature = await validMercadoPagoSignature(request, dataId);
  if (!signature.ok) {
    const status = signature.reason === "webhook_not_configured" ? 503 : 401;
    return NextResponse.json({ ok: false, error: signature.reason }, { status });
  }

  if (!acceptedSubscriptionTopic(type)) {
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  }

  const { accessToken } = mercadoPagoRuntimeConfig();
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "access_token_not_configured" }, { status: 503 });
  }

  let providerResponse: Response;
  try {
    providerResponse = await mercadoPagoRequest(`/preapproval/${encodeURIComponent(dataId)}`);
  } catch {
    return NextResponse.json({ ok: false, error: "provider_unavailable" }, { status: 503 });
  }

  // O simulador oficial usa um ID fictício. Mantemos o teste do endpoint em
  // 200 sem permitir que uma simulação altere qualquer assinatura local.
  if (providerResponse.status === 404 && dataId === "123456") {
    return NextResponse.json({ ok: true, simulated: true }, { status: 200 });
  }

  if (!providerResponse.ok) {
    return NextResponse.json({ ok: false, error: "provider_lookup_failed" }, { status: 502 });
  }

  const preapproval = (await providerResponse.json()) as MercadoPagoPreapproval;
  const synced = await syncLocalSubscriptionFromMercadoPago(preapproval);
  if (!synced.ok) {
    // Eventos válidos, porém não pertencentes ao Clube Yuri, são reconhecidos
    // sem causar mudanças internas. Divergências de pagador/plano são rejeitadas.
    if (["foreign_subscription", "local_subscription_not_found"].includes(synced.reason)) {
      return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
    }
    return NextResponse.json({ ok: false, error: synced.reason }, { status: 409 });
  }

  return NextResponse.json(
    { ok: true, received: true, type, resourceId: dataId, subscriptionId: synced.subscriptionId, status: synced.status },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
