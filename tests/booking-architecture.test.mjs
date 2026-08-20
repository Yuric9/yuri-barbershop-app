import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("booking client uses isolated booking API and cannot hang forever", async () => {
  const source = await readFile(new URL("../app/mobile-booking-bridge.tsx", import.meta.url), "utf8");
  assert.match(source, /fetchJson\("\/api\/booking"/);
  assert.doesNotMatch(source, /fetch\("\/api\/data"/);
  assert.match(source, /AbortController/);
  assert.match(source, /Tentar novamente/);
  assert.match(source, /observer\.disconnect\(\)/);
});

test("booking API validates past times, conflicts and stock", async () => {
  const source = await readFile(new URL("../app/api/booking/route.ts", import.meta.url), "utf8");
  assert.match(source, /America\/Sao_Paulo/);
  assert.match(source, /Este horário já passou/);
  assert.match(source, /Este período acabou de ser reservado/);
  assert.match(source, /Estoque insuficiente/);
  assert.match(source, /cache-control/);
  assert.match(source, /appointmentSlots/);
  assert.match(source, /reservationId/);
  assert.match(source, /appointment_slots_unique/);
});

test("legacy data API cannot bypass the isolated booking protections", async () => {
  const source = await readFile(new URL("../app/api/data/route.ts", import.meta.url), "utf8");
  assert.match(source, /Use a Central de Agendamentos/);
  assert.match(source, /status: 410/);
  assert.match(source, /db\.delete\(appointmentSlots\)/);
});

test("scheduled booking is registered before WhatsApp", async () => {
  const source = await readFile(new URL("../app/mobile-booking-bridge.tsx", import.meta.url), "utf8");
  const postIndex = source.indexOf('fetchJson("/api/booking"');
  const whatsappIndex = source.indexOf("window.location.assign");
  assert.ok(postIndex >= 0, "booking POST is missing");
  assert.ok(whatsappIndex > postIndex, "WhatsApp must open only after the booking call");
  assert.match(source, /Protocolo do agendamento/);
});

test("central keeps club copy aligned with six-visit business rule", async () => {
  const source = await readFile(new URL("../app/mobile-booking-bridge.tsx", import.meta.url), "utf8");
  assert.match(source, /Até 6 atendimentos por ciclo/);
  assert.doesNotMatch(source, /ilimitad/i);
});

test("booking central is protected by an error boundary", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const boundary = await readFile(new URL("../app/booking-error-boundary.tsx", import.meta.url), "utf8");
  assert.match(layout, /<BookingErrorBoundary>/);
  assert.match(boundary, /getDerivedStateFromError/);
  assert.match(boundary, /Recarregar Central/);
});

test("one-time payment webhook tolerates preference creation race", async () => {
  const source = await readFile(new URL("../app/subscription-one-time.ts", import.meta.url), "utf8");
  assert.match(source, /if \(existing\?\.preference_id\)/);
  assert.doesNotMatch(source, /preferenceId: existing\?\.preference_id \|\| ""/);
});
