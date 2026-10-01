export const WHATSAPP_BUSINESS_NUMBER = "5562981007636";

export function phoneDigits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

/** Telefones brasileiros com DDD: 10 ou 11 dígitos (ou 12–13 com o código 55). */
export function isValidPhone(value: unknown) {
  const digits = phoneDigits(value);
  return digits.length >= 10 && digits.length <= 13;
}

/** E-mail técnico usado para clientes cadastrados apenas com telefone. */
export function clientEmailForPhone(phone: string) {
  return `cliente-${phoneDigits(phone)}@cadastro.local`;
}

export function isTechnicalEmail(email: string) {
  return email.endsWith("@cadastro.local");
}

export function formatPhone(value: string) {
  const digits = phoneDigits(value).replace(/^55(?=\d{10,11}$)/, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return value;
}

export function whatsappLink(phone: string, text: string) {
  const digits = phoneDigits(phone);
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
