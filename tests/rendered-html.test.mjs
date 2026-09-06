import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("renders production-safe metadata without internal preview markers", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  assert.doesNotMatch(response.headers.get("link") ?? "", /\/workspace\//i);
  const html = await response.text();
  assert.doesNotMatch(html, /codex-preview/i);
  assert.doesNotMatch(html, /\/workspace\//i);
});

test("loads the central Yuri Design System", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const tokens = await readFile(new URL("../app/design-tokens.css", import.meta.url), "utf8");
  const system = await readFile(new URL("../app/design-system.css", import.meta.url), "utf8");

  assert.match(layout, /import "\.\/design-tokens\.css";/);
  assert.match(layout, /import "\.\/design-system\.css";/);
  assert.doesNotMatch(layout, /next\/font/);
  assert.match(tokens, /--yuri-gold:/);
  assert.match(tokens, /--font-ui:/);
  assert.match(tokens, /--radius-card:/);
  assert.match(system, /\.ui-button/);
  assert.match(system, /\.ui-card/);
  assert.match(system, /\.ui-field/);
});

test("booking date guard uses Sao Paulo business date", async () => {
  const guard = await readFile(new URL("../app/booking-date-guard.tsx", import.meta.url), "utf8");
  assert.match(guard, /America\/Sao_Paulo/);
  assert.match(guard, /input\.min = today/);
});

test("public login does not expose an administrator tab", async () => {
  const login = await readFile(new URL("../app/login-panel.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(login, />Administrador<\/button>/);
});

test("public home leads visitors into booking before restricted access", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /<h1 id="agendamento-title">Agende seu horário<\/h1>/);
  assert.match(page, /className="booking-with-ads"/);
  assert.match(page, /href="\/acesso-administrativo">Acesso administrativo/);
  assert.match(page, /A confirmação acontece pelo WhatsApp/);
  assert.match(page, /Privacidade e proteção de dados/);
  assert.doesNotMatch(page, /LoginPanel/);
  assert.doesNotMatch(page, /public-access-section/);
});

test("administrative access has its own route and reuses the existing login panel", async () => {
  const accessPage = await readFile(new URL("../app/acesso-administrativo/page.tsx", import.meta.url), "utf8");
  assert.match(accessPage, /import LoginPanel from "\.\.\/login-panel"/);
  assert.match(accessPage, /<LoginPanel \/>/);
  assert.match(accessPage, /href="\/"/);
});

test("registration and profile updates reject duplicate phone numbers", async () => {
  const register = await readFile(new URL("../app/api/auth/register/route.ts", import.meta.url), "utf8");
  const data = await readFile(new URL("../app/api/data/route.ts", import.meta.url), "utf8");
  assert.match(register, /Este telefone já está cadastrado/);
  assert.match(register, /profiles\.phone/);
  assert.match(data, /function normalizePhone/);
  assert.match(data, /Este telefone já está cadastrado/);
});
