import assert from "node:assert/strict";
import test from "node:test";
import { sameDayPreviousMonth, startOfWeek } from "../lib/domain/dates.ts";
import { expensesByCategory, percentChange, periodStats, serviceRanking } from "../lib/domain/finance.ts";
import { sortForQuickEntry } from "../lib/domain/quick-entry.ts";
import { launchDateFor, recurringStatus } from "../lib/domain/recurring.ts";

test("lançamento rápido: Corte, Barba e combos primeiro", () => {
  const services = [
    "Sobrancelha", "Combo Corte + Barba + sombrancelhas", "Pigmentação", "Barba", "Pezinho ", "Combo Corte + Barba", "Corte", "Relaxamento capilar + Corte",
  ].map((name) => ({ name }));
  assert.deepEqual(sortForQuickEntry(services).map((item) => item.name), [
    "Corte", "Barba", "Combo Corte + Barba", "Combo Corte + Barba + sombrancelhas", "Pezinho ", "Pigmentação", "Relaxamento capilar + Corte", "Sobrancelha",
  ]);
});

test("períodos: semana começa na segunda e comparação com o mês anterior", () => {
  assert.equal(startOfWeek("2026-10-07"), "2026-10-05"); // quarta → segunda
  assert.equal(startOfWeek("2026-10-11"), "2026-10-05"); // domingo → segunda anterior
  assert.equal(sameDayPreviousMonth("2026-03-31"), "2026-02-28");
  assert.equal(sameDayPreviousMonth("2026-01-15"), "2025-12-15");
});

const rows = [
  { id: 1, kind: "entrada", amountCents: 3000, date: "2026-10-06", serviceId: 1, serviceName: "Corte" },
  { id: 2, kind: "entrada", amountCents: 2500, date: "2026-10-07", serviceId: 1, serviceName: "Corte" }, // com desconto
  { id: 3, kind: "entrada", amountCents: 5000, date: "2026-10-07", serviceId: 3, serviceName: "Combo Corte + Barba" },
  { id: 4, kind: "entrada", amountCents: 1000, date: "2026-10-07" }, // entrada sem serviço
  { id: 5, kind: "despesa", amountCents: 72000, date: "2026-10-01", category: "Aluguel" },
  { id: 6, kind: "despesa", amountCents: 4000, date: "2026-10-03", category: "" },
];

test("contagem de atendimentos e faturamento por período", () => {
  assert.deepEqual(periodStats(rows, "2026-10-07", "2026-10-07"), { services: 2, income: 8500, averageTicket: 3750 });
  assert.deepEqual(periodStats(rows, "2026-10-01", "2026-10-31"), { services: 3, income: 11500, averageTicket: 3500 });
  assert.deepEqual(serviceRanking(rows, "2026-10-01", "2026-10-31"), [
    { name: "Corte", count: 2, amountCents: 5500 },
    { name: "Combo Corte + Barba", count: 1, amountCents: 5000 },
  ]);
  assert.equal(percentChange(12, 10), 20);
  assert.equal(percentChange(5, 0), null);
});

test("gastos por categoria", () => {
  assert.deepEqual(expensesByCategory(rows, "Sem categoria"), [
    { category: "Aluguel", amountCents: 72000 },
    { category: "Sem categoria", amountCents: 4000 },
  ]);
});

test("despesas fixas: pendente, vencida e já lançada", () => {
  const expenses = [
    { id: 1, description: "Aluguel", amountCents: 72000, dayOfMonth: 5, active: true },
    { id: 2, description: "Internet", amountCents: 10000, dayOfMonth: 20, active: true },
    { id: 3, description: "Antiga", amountCents: 100, dayOfMonth: 1, active: false },
  ];
  const status = recurringStatus(expenses, [], "2026-10-07");
  assert.deepEqual(status.map((item) => [item.description, item.launched, item.due]), [
    ["Aluguel", false, true],
    ["Internet", false, false],
  ]);
  const launched = recurringStatus(expenses, [{ recurringExpenseId: 1, date: "2026-10-05" }, { recurringExpenseId: 2, date: "2026-09-20" }], "2026-10-07");
  assert.deepEqual(launched.map((item) => item.launched), [true, false]);
  assert.equal(launchDateFor(5, "2026-10-07"), "2026-10-05");
  assert.equal(launchDateFor(20, "2026-10-07"), "2026-10-07"); // antes do vencimento: lança hoje
  assert.equal(launchDateFor(31, "2026-02-28"), "2026-02-28");
});
