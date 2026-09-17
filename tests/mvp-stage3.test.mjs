import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const route = await readFile(new URL("../app/api/data/route.ts", import.meta.url), "utf8");
const portal = await readFile(new URL("../app/portal-client.tsx", import.meta.url), "utf8");
const health = await readFile(new URL("../app/api/mvp-health/route.ts", import.meta.url), "utf8");
const enhancer = await readFile(new URL("../app/mvp-admin-flow-enhancer.tsx", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("stage 3 keeps the appointment state flow wired to the admin API", () => {
  assert.match(portal, /action:"appointment-status"/);
  assert.match(portal, /onClick=\{\(\)=>update\(a,"Confirmado"\)\}/);
  assert.match(portal, /onClick=\{\(\)=>update\(a,"Finalizado"\)\}/);
  assert.match(portal, /onClick=\{\(\)=>update\(a,"Cancelado"\)\}/);
  assert.match(portal, /Forma de pagamento ao finalizar/);
  assert.match(portal, /await onRefresh\(\)/);
});

test("finalizing an appointment is connected to the cash ledger", () => {
  assert.match(route, /status === "Finalizado"/);
  assert.match(route, /db\.insert\(transactions\)/);
  assert.match(route, /appointmentId: appointment\.id/);
  assert.match(route, /cashTransactionId: cashEntry\.id/);
});

test("cancelling an appointment releases its reservation slot", () => {
  assert.match(route, /status === "Cancelado"/);
  assert.match(route, /db\.delete\(appointmentSlots\)/);
  assert.match(route, /eq\(appointmentSlots\.appointmentId, appointment\.id\)/);
});

test("admin shortcut points to a new cash movement", () => {
  assert.match(enhancer, /text === "\+ Novo agendamento"/);
  assert.match(enhancer, /button\.textContent = "\+ Nova movimentação"/);
  assert.match(enhancer, /textContent\?\.trim\(\) === "Caixa"/);
  assert.match(layout, /MvpAdminFlowEnhancer/);
});

test("stage 3 blocks finishing until the appointment is confirmed in the UI", () => {
  assert.match(enhancer, /const canFinalize = status === "Confirmado"/);
  assert.match(enhancer, /button\.disabled = !canFinalize/);
});

test("stage 3 has an admin-only data integrity health check", () => {
  assert.match(health, /user\.role !== "admin"/);
  assert.match(health, /noDuplicateCashByAppointment/);
  assert.match(health, /cancelledReleaseSlots/);
  assert.match(health, /finalizedHaveCash/);
  assert.match(health, /pendingAndConfirmedHaveReservationSlot/);
});
