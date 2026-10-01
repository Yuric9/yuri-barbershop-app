/**
 * Hash de senhas com PBKDF2-SHA256 (Web Crypto, disponível no Worker).
 *
 * Formato: `pbkdf2-sha256$<iterações>$<salt>$<hash>` (base64url).
 * O runtime da Cloudflare aceita no máximo 100.000 iterações de PBKDF2.
 */

export const PBKDF2_ITERATIONS = 100_000;
const LEGACY_PREFIX = "sha256$";

const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (value.length % 4)) % 4);
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Comparação em tempo constante, para não vazar informação pelo tempo de resposta. */
function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function derive(password: string, salt: Uint8Array, iterations: number, length: number) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, key, length * 8);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, PBKDF2_ITERATIONS, 32);
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${bytesToBase64Url(salt)}$${bytesToBase64Url(hash)}`;
}

export async function verifyPassword(password: string, encoded: string) {
  // Formato antigo (SHA-256 sem salt). Aceito apenas para migração: após o
  // login a senha é regravada no formato PBKDF2 (ver `needsRehash`).
  if (encoded.startsWith(LEGACY_PREFIX)) {
    const expected = encoded.slice(LEGACY_PREFIX.length).trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(expected)) return false;
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(password)));
    return constantTimeEqual(encoder.encode(bytesToHex(digest)), encoder.encode(expected));
  }

  const [algorithm, iterationsText, saltText, expectedText] = encoded.split("$");
  if (algorithm !== "pbkdf2-sha256" || !iterationsText || !saltText || !expectedText) return false;
  const iterations = Number(iterationsText);
  if (!Number.isInteger(iterations) || iterations < 10_000 || iterations > PBKDF2_ITERATIONS) return false;
  const expected = base64UrlToBytes(expectedText);
  const actual = await derive(password, base64UrlToBytes(saltText), iterations, expected.length);
  return constantTimeEqual(actual, expected);
}

export function needsRehash(encoded: string) {
  return !encoded.startsWith(`pbkdf2-sha256$${PBKDF2_ITERATIONS}$`);
}

export function createSessionToken() {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashSessionToken(token: string) {
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(token))));
}
