import assert from "node:assert/strict";
import test from "node:test";
import { addDays, daysBetween, formatDate, isDateKey, monthRange, nowMinutes, todayKey } from "../lib/domain/dates.ts";
import { blockAffects, findFreeResource, isPastSlot, operatingWindow, slotsCovered, startTimesFor } from "../lib/domain/schedule.ts";
import { loyaltyAdjustmentFor, loyaltySnapshot } from "../lib/domain/loyalty.ts";
import { formatMoney, percentOf, toCents } from "../lib/domain/money.ts";
import { formatPhone, isValidPhone, whatsappLink } from "../lib/domain/phone.ts";
import { parseContactsFile } from "../lib/domain/contacts.ts";
import { dailyIncome, monthlySummaries, totals } from "../lib/domain/finance.ts";
import { canTransition } from "../lib/domain/catalog.ts";

test("datas usam o fuso de São Paulo", () => {
  // 02:30 UTC de 1º/out ainda é 30/set às 23:30 em São Paulo.
  const lateNight = new Date("2026-10-01T02:30:00Z");
  assert.equal(todayKey(lateNight), "2026-09-30");
  assert.equal(nowMinutes(lateNight), 23 * 60 + 30);
});

test("operações com datas", () => {
  assert.equal(addDays("2026-02-28", 1), "2026-03-01");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
  assert.equal(daysBetween("2026-09-01", "2026-10-01"), 30);
  assert.deepEqual(monthRange("2028-02"), { start: "2028-02-01", end: "2028-02-29" });
  assert.equal(formatDate("2026-10-01"), "01/10/2026");
  assert.equal(isDateKey("2026-02-30"), false);
  assert.equal(isDateKey("2026-02-28"), true);
});

test("horário de funcionamento por dia da semana", () => {
  assert.deepEqual(operatingWindow("2026-10-01"), { start: 18 * 60, end: 20 * 60 + 30 }); // quinta
  assert.deepEqual(operatingWindow("2026-10-03"), { start: 8 * 60, end: 20 * 60 + 30 }); // sábado
  assert.deepEqual(operatingWindow("2026-10-04"), { start: 8 * 60, end: 12 * 60 }); // domingo
  assert.equal(operatingWindow("data-invalida"), null);
});

test("horários respeitam a duração até o fechamento", () => {
  assert.deepEqual(startTimesFor("2026-10-01", 30), ["18:00", "18:30", "19:00", "19:30", "20:00"]);
  assert.deepEqual(startTimesFor("2026-10-01", 90), ["18:00", "18:30", "19:00"]);
  assert.deepEqual(startTimesFor("2026-10-04", 240), ["08:00"]);
  assert.deepEqual(slotsCovered("18:00", 90), ["18:00", "18:30", "19:00"]);
});

test("horário passado não pode ser agendado", () => {
  assert.equal(isPastSlot("2026-09-30", "19:00", "2026-10-01", 0), true);
  assert.equal(isPastSlot("2026-10-01", "18:00", "2026-10-01", 18 * 60), true);
  assert.equal(isPastSlot("2026-10-01", "18:30", "2026-10-01", 18 * 60), false);
});

test("encontra barbeiro livre considerando reservas e bloqueios", () => {
  const resources = ["barber:1", "barber:2"];
  const locks = [{ time: "18:30", resourceKey: "barber:1" }];
  assert.equal(findFreeResource({ time: "18:00", durationMin: 60, resources, locks, blocks: [] }), "barber:2");
  assert.equal(findFreeResource({ time: "19:00", durationMin: 60, resources, locks, blocks: [] }), "barber:1");
  const blocks = [{ time: "Dia inteiro", collaboratorId: 2 }];
  assert.equal(findFreeResource({ time: "18:00", durationMin: 60, resources, locks, blocks }), null);
  assert.equal(blockAffects("19:00", "18:30", 60), true);
  assert.equal(blockAffects("19:30", "18:30", 60), false);
});

test("cartão fidelidade: 8 atendimentos pagos liberam 1 cortesia", () => {
  const profile = { loyaltyAdjustment: 0, loyaltyRewardsRedeemed: 0 };
  assert.equal(loyaltySnapshot(profile, 7).rewardAvailable, false);
  assert.equal(loyaltySnapshot(profile, 7).progress, 7);
  const complete = loyaltySnapshot(profile, 8);
  assert.equal(complete.rewardAvailable, true);
  assert.equal(complete.progress, 8);
  const used = loyaltySnapshot({ loyaltyAdjustment: 0, loyaltyRewardsRedeemed: 1 }, 9);
  assert.equal(used.rewardAvailable, false);
  assert.equal(used.progress, 1);
  const adjusted = loyaltySnapshot({ loyaltyAdjustment: loyaltyAdjustmentFor(5, 2), loyaltyRewardsRedeemed: 0 }, 2);
  assert.equal(adjusted.eligibleVisits, 5);
});

test("dinheiro em centavos", () => {
  assert.equal(toCents(30.5), 3050);
  assert.equal(toCents("30,50"), 3050);
  assert.equal(toCents("R$ 1.234,56"), 123456);
  assert.equal(toCents("abc"), null);
  assert.equal(percentOf(5000, 40), 2000);
  assert.equal(formatMoney(123456).replace(/\s/g, " "), "R$ 1.234,56");
});

test("telefones e WhatsApp", () => {
  assert.equal(isValidPhone("(62) 99999-0000"), true);
  assert.equal(isValidPhone("9999-0000"), false);
  assert.equal(formatPhone("62999990000"), "(62) 99999-0000");
  assert.equal(whatsappLink("(62) 99999-0000", "Olá"), "https://wa.me/5562999990000?text=Ol%C3%A1");
});

test("importação de contatos CSV e VCF", () => {
  const csv = "Nome;Telefone\nJoão;(62) 99999-0000\nSem telefone;\nJoão de novo;62 99999 0000\n";
  assert.deepEqual(parseContactsFile("contatos.csv", csv), [{ name: "João de novo", phone: "62 99999 0000" }]);
  const vcf = "BEGIN:VCARD\nFN:Maria\nTEL;TYPE=CELL:+55 62 98888-1111\nEND:VCARD\n";
  assert.deepEqual(parseContactsFile("c.vcf", vcf), [{ name: "Maria", phone: "+55 62 98888-1111" }]);
});

test("resumos financeiros", () => {
  const transactions = [
    { id: 1, kind: "entrada", amountCents: 5000, date: "2026-10-01", serviceId: 1, appointmentId: 10 },
    { id: 2, kind: "despesa", amountCents: 2000, date: "2026-10-01" },
    { id: 3, kind: "entrada", amountCents: 3000, date: "2026-09-30", serviceId: 1 },
    { id: 4, kind: "entrada", amountCents: 1000, date: "2026-10-01" }, // venda de produto
  ];
  assert.deepEqual(totals(transactions), { income: 9000, expenses: 2000, balance: 7000 });
  assert.equal(monthlySummaries(transactions, 2026)[9].balance, 4000);
  assert.deepEqual(dailyIncome(transactions, "2026-10-01", 2), [
    { date: "2026-09-30", income: 3000 },
    { date: "2026-10-01", income: 6000 },
  ]);
});

test("status da agenda não volta depois de finalizado ou cancelado", () => {
  assert.equal(canTransition("Pendente", "Confirmado"), true);
  assert.equal(canTransition("Finalizado", "Cancelado"), false);
  assert.equal(canTransition("Cancelado", "Confirmado"), false);
});
