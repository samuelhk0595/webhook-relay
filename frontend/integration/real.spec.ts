import { expect, test } from "@playwright/test";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

test("real Rust/SQLite UI: namespace, fan-out, retry, payload, replay and metrics", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const received: { path: string; body: Buffer }[] = [];
  let failures = 0;
  const receiver = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    received.push({ path: req.url!, body: Buffer.concat(chunks) });
    const failing = req.url === "/b" && failures++ < 1;
    res.writeHead(failing ? 503 : 204);
    res.end();
  });
  await new Promise<void>((resolve) => receiver.listen(0, "127.0.0.1", resolve));
  const receiverUrl = `http://127.0.0.1:${(receiver.address() as AddressInfo).port}`;
  try {
    await page.goto("/admin/namespaces");
    await page.getByLabel("Usuário", { exact: true }).fill("browser-admin");
    await page.getByLabel("Senha", { exact: true }).fill("browser-test-password-123");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.getByRole("link", { name: "Novo namespace" }).click();
    await page.getByLabel("Nome de exibição").fill("Integração real");
    await page.getByLabel("Slug da URL").fill("real");
    await page.getByRole("button", { name: "Criar namespace", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Integração real", exact: true })).toBeVisible();
    const namespaceId = page.url().split("/").at(-1)!;
    for (const name of ["a", "b"]) {
      await page.goto(`/admin/namespaces/${namespaceId}`);
      await page.getByRole("link", { name: "Adicionar destino" }).click();
      await page.getByLabel("Nome do destino").fill(`Receptor ${name}`);
      await page.getByLabel("URL de destino").fill(`${receiverUrl}/${name}`);
      await page.getByLabel("Máximo de retries").fill("2");
      await page.getByLabel("Intervalo fixo (segundos)").fill("1");
      await page.getByRole("button", { name: "Criar destino", exact: true }).click();
      await expect(page.getByRole("heading", { name: `Receptor ${name}`, exact: true })).toBeVisible();
    }
    const payload = Buffer.from('{  "preserve": "spaces", "html": "<script>bad()</script>" }\n');
    const ingress = await request.post("/real", { data: payload, headers: { "content-type": "application/json" } });
    expect(ingress.status()).toBe(202);
    const { event_id } = await ingress.json();
    await expect.poll(() => received.length).toBe(3);
    expect(received.filter((r) => r.path === "/a")).toHaveLength(1);
    expect(received.filter((r) => r.path === "/b")).toHaveLength(2);
    received.forEach((r) => expect(r.body.equals(payload)).toBe(true));
    await page.goto(`/admin/events/${event_id}`);
    await expect(page.getByRole("heading", { name: "Detalhe do evento" })).toBeVisible();
    await page.getByRole("button", { name: "Ver prévia textual" }).click();
    await expect(page.locator("pre.payload")).toContainText("<script>bad()</script>");
    const me = await page.request.get("/api/v1/auth/me");
    const csrf = (await me.json()).csrf_token;
    const detail = async () => (await page.request.get(`/api/v1/events/${event_id}`)).json();
    await expect.poll(async () => (await detail()).deliveries.filter((d: { state: string }) => d.state === "succeeded").length).toBe(2);
    await page.getByRole("button", { name: "Reenviar evento", exact: true }).click();
    await page.getByRole("dialog").getByRole("checkbox", { name: /Receptor a/ }).check();
    await page.getByRole("button", { name: "Reenviar para 1 destino", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect.poll(() => received.length).toBe(4);
    expect((await detail()).deliveries).toHaveLength(3);
    // API periods are closed on complete minute boundaries. Include the current bucket explicitly.
    const from = new Date(Date.now() - 60000).toISOString();
    const to = new Date(Date.now() + 60000).toISOString();
    const summary = await page.request.get(`/api/v1/stats/summary?from=${from}&to=${to}`);
    expect(await summary.json()).toMatchObject({ received: 1, delivered: 3, failed_attempts: 1, permanent_failed: 0 });
    // Dashboard uses the same real API/SQLite aggregates; choose an explicit window containing this minute.
    await page.goto(`/admin/?range=custom&from=${from}&to=${to}`);
    await expect(page.getByRole("heading", { name: "Fila agora" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Receptor a", exact: true })).toBeVisible();
    // Test cookie CSRF on the actual server, not merely whether the client sends a header.
    const forbidden = await page.request.post("/api/v1/tokens", { data: { name: "missing csrf" } });
    expect(forbidden.status()).toBe(403);
    const created = await page.request.post("/api/v1/tokens", { headers: { "x-csrf-token": csrf }, data: { name: "real-agent", expires_at: null } });
    expect(created.status()).toBe(201);
    const token = await created.json();
    expect((await request.get("/api/v1/openapi.json", { headers: { authorization: `Bearer ${token.secret}` } })).status()).toBe(200);
    await page.goto("/admin/tokens");
    await expect(page.getByText("real-agent", { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    receiver.closeAllConnections();
    await new Promise<void>((resolve) => receiver.close(() => resolve()));
  }
});
