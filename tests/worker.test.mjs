/**
 * Testes de integração do Worker gerado pelo build (`dist/server/index.js`).
 * Rode `npm run build` antes (o `npm test` já faz isso).
 */
import assert from "node:assert/strict";
import test from "node:test";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);

const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const ctx = { waitUntil() {}, passThroughOnException() {} };
const request = (path, init) => worker.fetch(new Request(`http://localhost${path}`, init), env, ctx);

test("a página inicial mostra o login com cabeçalhos de segurança", async () => {
  const response = await request("/", { headers: { accept: "text/html" } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  const html = await response.text();
  assert.match(html, /Acesso administrativo/);
  assert.match(html, /lang="pt-BR"/);
});

test("a API exige login de administrador", async () => {
  for (const path of ["/api/clients", "/api/dashboard", "/api/transactions", "/api/services"]) {
    const response = await request(path);
    assert.equal(response.status, 401, path);
    assert.match((await response.json()).error, /sessão/i);
  }
});

test("escritas vindas de outro site são bloqueadas", async () => {
  const response = await request("/api/clients", {
    method: "POST",
    headers: { origin: "https://site-malicioso.example", "content-type": "application/json" },
    body: JSON.stringify({ name: "Teste", phone: "62999990000" }),
  });
  assert.equal(response.status, 403);
});

test("login valida os dados antes de consultar o banco", async () => {
  const response = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "invalido", password: "" }),
  });
  assert.equal(response.status, 400);
});

test("as rotas removidas do Mercado Pago não existem mais", async () => {
  for (const path of ["/api/webhooks/mercadopago", "/api/subscriptions/checkout", "/api/data"]) {
    const response = await request(path);
    assert.equal(response.status, 404, path);
  }
});
