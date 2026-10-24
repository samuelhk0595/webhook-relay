import { expect, test, type Page } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { resolve } from "node:path";
import { fixturePayload, mockApi, namespace, webhookEvent } from "./fixtures";

const review = resolve("..", ".impeccable", "review");
async function capture(page: Page, name: string) {
  await mkdir(review, { recursive: true });
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
    await new Promise(requestAnimationFrame);
  });
  await page.screenshot({
    path: resolve(review, name),
    fullPage: (await page.getByRole("dialog").count()) === 0,
    animations: "disabled",
  });
}
async function noPageOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    oversized: [...document.querySelectorAll("body *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.right > window.innerWidth && !el.closest(".table-scroll");
      })
      .slice(0, 15)
      .map((el) => ({
        tag: el.tagName,
        className: el.className,
        text: el.textContent?.slice(0, 70),
        rect: el.getBoundingClientRect().toJSON(),
      })),
  }));
  expect(sizes.document, JSON.stringify(sizes)).toBeLessThanOrEqual(
    sizes.viewport + 1,
  );
}

test("login, invalid credentials, protected redirect and logout", async ({
  page,
}) => {
  await mockApi(page, { loggedIn: false });
  await page.goto("/admin/events");
  await expect(
    page.getByRole("heading", { name: "Entrar no console" }),
  ).toBeVisible();
  await capture(page, "login-desktop.png");
  await page.getByLabel("Usuário", { exact: true }).fill("samuel");
  await page.getByLabel("Senha", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Mostrar senha" }).click();
  await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Usuário ou senha inválidos.",
  );
  await page.getByLabel("Senha", { exact: true }).fill("test-password-only");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Eventos", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(
    page.getByRole("heading", { name: "Entrar no console" }),
  ).toBeVisible();
});

test("dashboard semantics, filters, real endpoint parameters and custom date validation", async ({
  page,
}) => {
  const { requests } = await mockApi(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/admin/");
  await expect(page.getByText("3.421", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fila agora" })).toBeVisible();
  await expect(page.locator(".recharts-line")).toHaveCount(3);
  await noPageOverflow(page);
  await capture(page, "desktop.png");
  await page.getByLabel("Namespace", { exact: true }).selectOption("ns-automa");
  await page.getByLabel("Destino", { exact: true }).selectOption("dst-home");
  await expect(
    page.getByText(/O filtro de destino afeta entregas/),
  ).toBeVisible();
  await expect(page.getByText("1.284", { exact: true })).toBeVisible();
  await page.getByLabel("Período", { exact: true }).selectOption("7d");
  await expect
    .poll(() =>
      requests
        .filter((r) => r.url().includes("/stats/summary"))
        .at(-1)
        ?.url(),
    )
    .toContain("destination_id=dst-home");
  await expect
    .poll(() => {
      const last = requests
        .filter((r) => r.url().includes("/stats/summary"))
        .at(-1);
      if (!last) return 0;
      const url = new URL(last.url());
      return (
        new Date(url.searchParams.get("to")!).getTime() -
        new Date(url.searchParams.get("from")!).getTime()
      );
    })
    .toBe(7 * 86400000);
  const stats = new URL(
    requests
      .filter((r) => r.url().includes("/stats/summary"))
      .at(-1)!
      .url(),
  );
  expect(
    new Date(stats.searchParams.get("to")!).getTime() -
      new Date(stats.searchParams.get("from")!).getTime(),
  ).toBe(7 * 86400000);
  expect(new Date(stats.searchParams.get("from")!).getSeconds()).toBe(0);
  await page.getByLabel("Período", { exact: true }).selectOption("custom");
  await expect(page.getByRole("alert")).toContainText(
    "Informe um início anterior ao fim",
  );
  await page.getByLabel("De (inclusive)").fill("2026-10-01T00:00");
  await page.getByLabel("Até (exclusive)").fill("2026-10-02T00:00");
  await expect
    .poll(() =>
      requests
        .filter((r) => r.url().includes("/stats/summary"))
        .at(-1)
        ?.url(),
    )
    .toContain("2026-10-01T03");
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("create namespace and destination; edit policy; pause, resume and archive", async ({
  page,
}) => {
  const { requests, session } = await mockApi(page);
  await page.goto("/admin/namespaces");
  await page.getByRole("link", { name: "Novo namespace" }).click();
  await page.getByLabel("Nome de exibição").fill("Casa e laboratório");
  await page.getByLabel("Slug da URL").fill("casa-lab");
  await page
    .getByRole("button", { name: "Criar namespace", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Casa e laboratório", exact: true }),
  ).toBeVisible();
  const creation = requests.find(
    (r) => r.method() === "POST" && r.url().endsWith("/namespaces"),
  )!;
  expect(creation.headers()["x-csrf-token"]).toBe(session.csrf_token);
  await page.getByRole("link", { name: "Adicionar destino" }).click();
  await page.getByLabel("Nome do destino").fill("Computador de testes");
  await page.getByLabel("URL de destino").fill("http://10.8.0.2:9000/local");
  await page.getByLabel("Máximo de retries").fill("0");
  await expect(
    page.getByText("Uma única tentativa, sem retry automático."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Criar destino", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Computador de testes", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Retries ilimitados").check();
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect
    .poll(
      () =>
        requests
          .filter(
            (r) => r.method() === "PATCH" && r.url().includes("/destinations/"),
          )
          .at(-1)
          ?.postDataJSON().max_retries,
    )
    .toBeNull();
  await page
    .getByRole("button", { name: "Pausar entregas", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Pausar entregas" })
    .click();
  await expect(
    page.getByText(/Este destino continua acumulando fila/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retomar entregas" }).click();
  await expect(
    page.getByRole("button", { name: "Pausar entregas", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Arquivar destino", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Arquivar destino" })
    .click();
  await expect(
    page.getByText(/Destino arquivado: sem novas inscrições/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Salvar alterações" }),
  ).toBeDisabled();
});

test("payload is escaped, repeated headers survive, attempts and pagination work", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/admin/events");
  await page.getByRole("button", { name: "Carregar mais" }).click();
  await expect(page.getByRole("link", { name: "evt-second-p" })).toBeVisible();
  await page
    .getByRole("link", { name: webhookEvent.id.slice(0, 12), exact: true })
    .click();
  await page.getByRole("button", { name: "Ver prévia textual" }).click();
  await expect(page.locator("pre.payload")).toHaveText(fixturePayload);
  expect(await page.evaluate(() => "payloadExecuted" in window)).toBeFalsy();
  await expect(
    page.getByRole("cell", { name: "x-tag", exact: true }),
  ).toHaveCount(2);
  await expect(page.getByText("•••••••• (sensível)")).toBeVisible();
  await page
    .locator(".delivery-item")
    .first()
    .locator("summary")
    .first()
    .click();
  await expect(page.getByText("HTTP 503 Service Unavailable")).toBeVisible();
  await page.getByText("Trecho da resposta (limitado)").click();
  await expect(page.locator(".response-excerpt")).toHaveText(
    "<h1>Serviço indisponível</h1>",
  );
  await capture(page, "event-desktop.png");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar bytes" }).click();
  expect((await download).suggestedFilename()).toBe(
    `event-${webhookEvent.id}.bin`,
  );
});

test("replay keeps idempotency key across failed administrative requests", async ({
  page,
}) => {
  const { requests } = await mockApi(page);
  let first = true;
  await page.route("**/events/*/replays", async (route) => {
    if (first) {
      first = false;
      requests.push(route.request());
      return route.fulfill({
        status: 503,
        json: {
          error: {
            code: "temporary",
            message: "Erro temporário. Tente novamente.",
          },
        },
      });
    }
    return route.fallback();
  });
  await page.goto(`/admin/events/${webhookEvent.id}`);
  await page.getByRole("button", { name: "Reenviar evento" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox").first().check();
  await dialog
    .getByRole("button", { name: "Reenviar para 1 destino", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("Erro temporário");
  await dialog
    .getByRole("button", { name: "Reenviar para 1 destino", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  const replays = requests.filter((r) => r.url().endsWith("/replays"));
  expect(replays).toHaveLength(2);
  expect(replays[0].headers()["idempotency-key"]).toBe(
    replays[1].headers()["idempotency-key"],
  );
  expect(replays[0].postDataJSON()).toEqual({ destination_ids: ["dst-home"] });
});

test("token creation displays secret once; metadata listing and revocation", async ({
  page,
}) => {
  const { requests } = await mockApi(page);
  await page.goto("/admin/tokens");
  await page.getByRole("button", { name: "Criar token", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome do token").fill("Automação de teste");
  await dialog
    .getByRole("button", { name: "Criar token", exact: true })
    .click();
  await expect(
    dialog.getByText("whf_SYNTHETIC_PLAYWRIGHT_VALUE_NOT_A_CREDENTIAL"),
  ).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Concluir" })).toBeDisabled();
  await capture(page, "token-desktop.png");
  await dialog.getByLabel("Guardei o token em um local seguro").check();
  await dialog.getByRole("button", { name: "Concluir" }).click();
  await expect(
    page.getByText("whf_SYNTHETIC_PLAYWRIGHT_VALUE_NOT_A_CREDENTIAL"),
  ).toHaveCount(0);
  expect(await page.evaluate(() => Object.values(localStorage))).toEqual([]);
  await page
    .getByRole("row")
    .filter({ hasText: "Automação de teste" })
    .getByRole("button", { name: "Revogar" })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Revogar token" })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "Automação de teste" }),
  ).toContainText("Revogado");
  expect(
    requests.filter(
      (r) => r.method() === "DELETE" && r.url().endsWith("/tokens/token-new"),
    ),
  ).toHaveLength(1);
});

test("empty data is honest, including rate with zero denominator", async ({
  page,
}) => {
  await mockApi(page, { empty: true });
  await page.goto("/admin/");
  await expect(page.getByText("Sem dados", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Ainda sem atividade neste período"),
  ).toBeVisible();
  await expect(page.getByText("Nenhum destino encontrado")).toBeVisible();
  await capture(page, "empty-desktop.png");
  await page.getByRole("link", { name: "Namespaces", exact: true }).click();
  await expect(page.getByText("Crie sua primeira entrada")).toBeVisible();
});

test("API error is visible, no fabricated metrics and recovery works", async ({
  page,
}) => {
  await mockApi(page, { failStats: true });
  await page.goto("/admin/");
  await expect(page.getByRole("alert").first()).toContainText(
    "Banco temporariamente indisponível",
  );
  await expect(page.locator(".metric")).toHaveCount(0);
  await capture(page, "error-desktop.png");
  await page.unrouteAll({ behavior: "wait" });
  await mockApi(page);
  await page.getByRole("button", { name: "Tentar novamente" }).first().click();
  await expect(page.getByText("1.284", { exact: true })).toBeVisible();
});

test("mobile layout, focus-trapped menu, forms and long payload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockApi(page);
  await page.goto("/admin/");
  await expect(page.getByText("1.284", { exact: true })).toBeVisible();
  await expect(page.locator(".recharts-line")).toHaveCount(3);
  await noPageOverflow(page);
  await capture(page, "mobile.png");
  await page.getByRole("button", { name: "Abrir navegação" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("link", { name: "Namespaces", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("link", { name: "Gerenciar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: namespace.name, exact: true }),
  ).toBeVisible();
  await noPageOverflow(page);
  await page.getByRole("link", { name: "Adicionar destino" }).click();
  await expect(
    page.getByRole("heading", { name: "Novo destino" }),
  ).toBeVisible();
  await capture(page, "destination-mobile.png");
  await noPageOverflow(page);
  await page.goto(`/admin/events/${webhookEvent.id}`);
  await page.getByRole("button", { name: "Ver prévia textual" }).click();
  await expect(page.locator("pre.payload")).toContainText("<script>");
  await noPageOverflow(page);
  await capture(page, "event-mobile.png");
  await page.getByRole("button", { name: "Reenviar evento" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await noPageOverflow(page);
  await capture(page, "replay-mobile.png");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("small phone, tablet, landscape and zoom-equivalent CSS viewport do not overflow the document", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/admin/");
  await expect(page.getByText("1.284", { exact: true })).toBeVisible();
  for (const viewport of [
    { width: 375, height: 812 },
    { width: 768, height: 1024 },
    { width: 844, height: 390 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    await noPageOverflow(page);
  }
  await page.setViewportSize({ width: 768, height: 1024 });
  await capture(page, "tablet.png");
  // 1440px display at 200% browser zoom has an effective 720px CSS viewport.
  // CSS `zoom` is not browser zoom: it does not update media queries.
  await page.setViewportSize({ width: 720, height: 500 });
  await noPageOverflow(page);
});

test("polling pauses when document is hidden and resumes on activation", async ({
  page,
}) => {
  const { requests } = await mockApi(page);
  await page.clock.install();
  await page.goto("/admin/");
  await expect(page.getByText("1.284", { exact: true })).toBeVisible();
  const count = () =>
    requests.filter((r) => r.url().includes("/stats/summary")).length;
  const initial = count();
  await page.clock.runFor(10500);
  await expect.poll(count).toBeGreaterThan(initial);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const before = count();
  await page.clock.runFor(21000);
  expect(count()).toBe(before);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(10500);
  await expect.poll(count).toBeGreaterThan(before);
});

test("binary payload download preserves bytes and never offers a text preview", async ({
  page,
}) => {
  await mockApi(page);
  const binary = Buffer.from([0, 255, 128, 10, 13, 42]);
  await page.route("**/api/v1/events/evt-binary", (route) =>
    route.fulfill({
      json: {
        event: {
          ...webhookEvent,
          id: "evt-binary",
          content_type: "application/octet-stream",
          body_size: binary.length,
        },
        headers: [],
        deliveries: [],
      },
    }),
  );
  await page.route("**/api/v1/events/evt-binary/payload", (route) =>
    route.fulfill({ body: binary, contentType: "application/octet-stream" }),
  );
  await page.goto("/admin/events/evt-binary");
  await expect(
    page.getByText(/Conteúdo binário ou tipo não textual/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ver prévia textual" }),
  ).toHaveCount(0);
  const pendingDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar bytes" }).click();
  const download = await pendingDownload;
  expect(await readFile((await download.path())!)).toEqual(binary);
});

test("retained metadata without payload disables replay and download", async ({
  page,
}) => {
  await mockApi(page);
  await page.route("**/api/v1/events/evt-pruned", (route) =>
    route.fulfill({
      json: {
        event: { ...webhookEvent, id: "evt-pruned", payload_available: false },
        headers: [],
        deliveries: [],
      },
    }),
  );
  await page.goto("/admin/events/evt-pruned");
  await expect(
    page.getByText(/O payload não está mais disponível/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Baixar bytes" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Reenviar evento" }),
  ).toHaveCount(0);
});

test("expired session redirects instead of leaving protected data on screen", async ({
  page,
}) => {
  await mockApi(page);
  await page.route("**/api/v1/events?**", (route) =>
    route.fulfill({
      status: 401,
      json: { error: { code: "unauthenticated", message: "Sessão expirada." } },
    }),
  );
  let meCalls = 0;
  await page.route("**/api/v1/auth/me", (route) => {
    if (meCalls++)
      return route.fulfill({
        status: 401,
        json: {
          error: { code: "unauthenticated", message: "Sessão expirada." },
        },
      });
    return route.fallback();
  });
  await page.goto("/admin/events");
  await expect(
    page.getByRole("heading", { name: "Entrar no console" }),
  ).toBeVisible();
  await expect(page.locator("table")).toHaveCount(0);
});

test("backend field validation keeps destination values editable", async ({
  page,
}) => {
  await mockApi(page);
  await page.route("**/api/v1/destinations/dst-home", (route) =>
    route.request().method() === "PATCH"
      ? route.fulfill({
          status: 422,
          json: {
            error: {
              code: "validation",
              message: "Verifique os campos indicados.",
              fields: { url: "A URL aponta para o próprio relay." },
            },
          },
        })
      : route.fallback(),
  );
  await page.goto("/admin/destinations/dst-home");
  await page.getByLabel("Nome do destino").fill("Nome preservado");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "A URL aponta para o próprio relay.",
  );
  await expect(page.getByLabel("URL de destino")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByLabel("Nome do destino")).toHaveValue(
    "Nome preservado",
  );
});

test("accessibility checks on dashboard and mobile replay dialog", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockApi(page);
  await page.goto("/admin/");
  await expect(page.getByText("1.284", { exact: true })).toBeVisible();
  await expect(page.locator(".recharts-line")).toHaveCount(3);
  const dashboard = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(dashboard.violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/admin/events/${webhookEvent.id}`);
  await page.getByRole("button", { name: "Reenviar evento" }).click();
  const replay = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(replay.violations).toEqual([]);
});
