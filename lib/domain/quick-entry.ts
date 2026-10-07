/**
 * Lançamento rápido do caixa: em que ordem os serviços aparecem.
 *
 * Os mais feitos vêm primeiro: Corte, Barba e os combos (do mais simples ao
 * mais completo). Os demais seguem em ordem alfabética.
 */

function normalize(name: string) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function rank(name: string) {
  const text = normalize(name);
  if (text === "corte") return 0;
  if (text === "barba") return 1;
  if (text.startsWith("combo") || (text.includes("corte") && text.includes("barba"))) return 2;
  return 3;
}

export function sortForQuickEntry<T extends { name: string }>(services: T[]) {
  return [...services].sort(
    (a, b) =>
      rank(a.name) - rank(b.name) ||
      // Entre os combos, o mais simples (nome mais curto) primeiro.
      (rank(a.name) === 2 ? a.name.length - b.name.length : 0) ||
      a.name.localeCompare(b.name, "pt-BR"),
  );
}
