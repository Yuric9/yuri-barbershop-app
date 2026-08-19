import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
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
  assert.match(await response.text(), developmentPreviewMeta);
});

test("loads the central Yuri Design System", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const tokens = await readFile(new URL("../app/design-tokens.css", import.meta.url), "utf8");
  const system = await readFile(new URL("../app/design-system.css", import.meta.url), "utf8");

  assert.match(layout, /import "\.\/design-tokens\.css";/);
  assert.match(layout, /import "\.\/design-system\.css";/);
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
