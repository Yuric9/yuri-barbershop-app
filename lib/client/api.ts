"use client";

/**
 * Comunicação do painel com a API.
 *
 * - `api()` faz a requisição e transforma erros em `ApiClientError` com a
 *   mensagem enviada pelo servidor.
 * - `useApi()` carrega dados com cache em memória. Depois de uma alteração,
 *   chame `invalidate("/api/...")` para que todas as telas que usam aquele
 *   endereço recarreguem automaticamente.
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export class ApiClientError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export async function api<T = unknown>(url: string, options: { method?: Method; body?: unknown } = {}): Promise<T> {
  const isForm = options.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      cache: "no-store",
      headers: options.body === undefined || isForm ? undefined : { "content-type": "application/json" },
      body: options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiClientError(0, "Sem conexão com o servidor. Verifique a internet e tente novamente.");
  }
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (response.status === 401) {
    // Sessão expirada: volta para a tela de login.
    window.location.assign("/");
  }
  if (!response.ok) throw new ApiClientError(response.status, data.error || "Não foi possível concluir a operação.");
  return data;
}

// ─── Cache compartilhado ─────────────────────────────────────────────────────

const cache = new Map<string, unknown>();
const inFlight = new Map<string, Promise<unknown>>();
let version = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Descarta o cache dos endereços que começam com algum dos prefixos. */
export function invalidate(...prefixes: readonly string[]) {
  for (const key of [...cache.keys(), ...inFlight.keys()]) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      cache.delete(key);
      inFlight.delete(key);
    }
  }
  version++;
  listeners.forEach((listener) => listener());
}

export type ApiState<T> = {
  data: T | undefined;
  error: string;
  loading: boolean;
  reload: () => void;
};

/** Carrega `url` (ou nada, se `null`) e recarrega quando o cache é invalidado. */
export function useApi<T>(url: string | null): ApiState<T> {
  const cacheVersion = useSyncExternalStore(subscribe, () => version, () => 0);
  const [result, setResult] = useState<{ url: string; data?: T; error: string }>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!url || cache.has(url)) return;
    let active = true;
    // Várias telas pedindo o mesmo endereço compartilham uma única requisição.
    let request = inFlight.get(url) as Promise<T> | undefined;
    if (!request) {
      request = api<T>(url).then((data) => {
        if (inFlight.get(url) === request) cache.set(url, data);
        return data;
      });
      request.finally(() => inFlight.get(url) === request && inFlight.delete(url)).catch(() => undefined);
      inFlight.set(url, request);
    }
    request
      .then((data) => {
        if (active) setResult({ url, data, error: "" });
      })
      .catch((error: Error) => {
        if (active) setResult((previous) => ({ url, data: previous?.url === url ? previous.data : undefined, error: error.message }));
      });
    return () => {
      active = false;
    };
  }, [url, cacheVersion, attempt]);

  const reload = useCallback(() => {
    if (url) cache.delete(url);
    setResult((previous) => (previous ? { ...previous, error: "" } : previous));
    setAttempt((value) => value + 1);
  }, [url]);

  const cached = url ? (cache.get(url) as T | undefined) : undefined;
  const own = result?.url === url ? result : undefined;
  const error = cached === undefined ? (own?.error ?? "") : "";
  return {
    // Enquanto recarrega, mantém os dados anteriores na tela.
    data: cached ?? own?.data,
    error,
    loading: Boolean(url) && cached === undefined && !error,
    reload,
  };
}

/** Reduz fotos grandes no navegador antes do envio (máx. 1600 px, JPEG 82%). */
async function optimizeImage(file: File) {
  if (file.size <= 1_500_000 || typeof createImageBitmap !== "function") return file;
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

export async function uploadImage(file: File) {
  const form = new FormData();
  form.append("file", await optimizeImage(file));
  const { key } = await api<{ key: string }>("/api/upload", { method: "POST", body: form });
  return key;
}

export function imageUrl(key: string) {
  return key ? `/api/upload?key=${encodeURIComponent(key)}` : "";
}
