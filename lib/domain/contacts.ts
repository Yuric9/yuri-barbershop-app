/**
 * Leitura de contatos exportados do celular (VCF) ou de planilhas (CSV).
 */
import { isValidPhone, phoneDigits } from "./phone.ts";

export type ContactCandidate = { name: string; phone: string };

function parseVcf(text: string): ContactCandidate[] {
  return text.split(/END:VCARD/i).map((card) => ({
    name: (/(?:^|\n)FN[^:\n]*:(.*)/i.exec(card)?.[1] ?? "").trim(),
    phone: (/(?:^|\n)TEL[^:\n]*:(.*)/i.exec(card)?.[1] ?? "").trim(),
  }));
}

function splitCsvLine(line: string, separator: string) {
  return line.split(separator).map((cell) => cell.trim().replace(/^["']|["']$/g, "").trim());
}

function parseCsv(text: string): ContactCandidate[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const first = lines[0];
  const separator = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ";" : ",";
  const headers = splitCsvLine(first, separator).map((header) => header.toLowerCase());
  const nameIndex = headers.findIndex((header) => /nome|name/.test(header));
  const phoneIndex = headers.findIndex((header) => /telefone|celular|phone|tel|whatsapp/.test(header));
  const hasHeader = nameIndex >= 0 && phoneIndex >= 0;
  return lines.slice(hasHeader ? 1 : 0).map((line) => {
    const cells = splitCsvLine(line, separator);
    return { name: cells[hasHeader ? nameIndex : 0] ?? "", phone: cells[hasHeader ? phoneIndex : 1] ?? "" };
  });
}

/** Remove contatos sem nome/telefone e duplicados (pelo número). */
export function uniqueContacts(rows: ContactCandidate[]) {
  const unique = new Map<string, ContactCandidate>();
  for (const row of rows) {
    const name = row.name.trim().slice(0, 120);
    const phone = row.phone.trim().slice(0, 40);
    const key = phoneDigits(phone);
    if (name && isValidPhone(key)) unique.set(key, { name, phone });
  }
  return [...unique.values()];
}

export function parseContactsFile(fileName: string, text: string) {
  const isVcf = /\.vcf$/i.test(fileName) || /BEGIN:VCARD/i.test(text);
  return uniqueContacts(isVcf ? parseVcf(text) : parseCsv(text));
}
