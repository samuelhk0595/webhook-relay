/** Synthetic fixtures. Only Playwright intercepts these requests; never imported by src/. */
import type { Page as BrowserPage, Request } from "@playwright/test";
import type {
  Destination,
  Namespace,
  Summary,
  Token,
  WebhookEvent,
} from "../src/lib/contracts";

export const namespace: Namespace = {
  id: "ns-automa",
  name: "Automações",
  slug: "automacoes",
  ingress_url: "https://relay.example.test/automacoes",
  status: "active",
  has_ingress_secret: true,
  destination_count: 3,
  created_at: "2026-10-22T12:00:00Z",
};
export const destinations: Destination[] = [
  {
    id: "dst-home",
    namespace_id: namespace.id,
    name: "Computador de casa",
    url: "http://10.8.0.2:9000/hooks",
    status: "active",
    max_retries: 288,
    retry_interval_seconds: 300,
    timeout_seconds: 15,
    created_at: namespace.created_at,
  },
  {
    id: "dst-backup",
    namespace_id: namespace.id,
    name: "Servidor de apoio",
    url: "https://receiver.example.test/backup",
    status: "active",
    max_retries: 0,
    retry_interval_seconds: 300,
    timeout_seconds: 15,
    created_at: namespace.created_at,
  },
  {
    id: "dst-lab",
    namespace_id: namespace.id,
    name: "Laboratório",
    url: "http://10.8.0.3:8080/events",
    status: "paused",
    max_retries: null,
    retry_interval_seconds: 300,
    timeout_seconds: 15,
    created_at: namespace.created_at,
  },
];
export const webhookEvent: WebhookEvent = {
  id: "evt-a4106e06-49cb-4bd1-b13b-555f6c7f04b6",
  namespace_id: namespace.id,
  namespace_name: namespace.name,
  method: "POST",
  original_query: "source=local&tag=a&tag=b",
  content_type: "application/json",
  body_size: 93,
  received_at: "2026-10-24T14:12:40Z",
  payload_available: true,
  delivery_count: 3,
  succeeded_count: 1,
  failed_count: 0,
  pending_count: 2,
};
export const fixturePayload =
  '{\n  "action": "test",\n  "value": "<script>window.payloadExecuted = true</script>"\n}';
export const exampleToken: Token = {
  id: "token-one",
  name: "Agente de manutenção",
  prefix: "whf_test",
  created_at: namespace.created_at,
  last_used_at: "2026-10-24T14:08:00Z",
  expires_at: null,
  revoked_at: null,
};

export async function mockApi(
  page: BrowserPage,
  options: { loggedIn?: boolean; empty?: boolean; failStats?: boolean } = {},
) {
  let loggedIn = options.loggedIn ?? true;
  const namespaces = options.empty ? [] : [structuredClone(namespace)];
  const dests = options.empty ? [] : structuredClone(destinations);
  const tokens = options.empty ? [] : [structuredClone(exampleToken)];
  const requests: Request[] = [];
  const session = {
    id: "admin-test",
    username: "samuel",
    csrf_token: "csrf-for-local-playwright-only",
  };
  const collection = <T>(items: T[]) => ({ items, next_cursor: null });
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    requests.push(request);
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/v1", "");
    const method = request.method();
    const reply = (data: unknown, status = 200) =>
      route.fulfill({ status, json: data });
    const problem = (status: number, message: string) =>
      reply({ error: { code: "test_error", message } }, status);
    if (path === "/auth/login") {
      if (request.postDataJSON().password !== "test-password-only")
        return problem(401, "Usuário ou senha inválidos.");
      loggedIn = true;
      return reply(session);
    }
    if (!loggedIn) return problem(401, "Sessão expirada. Entre novamente.");
    if (path === "/auth/me") return reply(session);
    if (path === "/auth/logout") {
      loggedIn = false;
      return route.fulfill({ status: 204 });
    }
    if (path.startsWith("/stats/")) {
      if (options.failStats)
        return problem(
          503,
          "Banco temporariamente indisponível. Tente novamente.",
        );
      const period = {
        from: url.searchParams.get("from")!,
        to: url.searchParams.get("to")!,
        granularity: "hour" as const,
      };
      const summary: Summary = {
        period,
        received: options.empty ? 0 : 1284,
        delivered: options.empty ? 0 : 3421,
        permanent_failed: options.empty ? 0 : 7,
        failed_attempts: options.empty ? 0 : 148,
        finalized_attempts: options.empty ? 0 : 3569,
        failure_rate: options.empty ? null : 148 / 3569,
        queue: {
          pending: options.empty ? 0 : 12,
          retry_scheduled: options.empty ? 0 : 38,
          in_flight: options.empty ? 0 : 2,
          paused: options.empty ? 0 : 9,
          oldest_pending_age_seconds: options.empty ? null : 8440,
        },
      };
      if (path === "/stats/summary") return reply(summary);
      if (path === "/stats/timeseries")
        return reply({
          period,
          points: options.empty
            ? []
            : Array.from({ length: 24 }, (_, i) => ({
                timestamp: new Date(
                  new Date(period.from).getTime() + i * 3600000,
                ).toISOString(),
                received: [
                  22, 17, 8, 6, 4, 11, 21, 47, 65, 72, 54, 46, 70, 91, 116, 82,
                  63, 84, 60, 48, 73, 91, 67, 48,
                ][i],
                delivered: [
                  66, 49, 24, 18, 12, 30, 63, 133, 183, 210, 156, 140, 202, 262,
                  324, 240, 178, 243, 170, 139, 212, 265, 196, 140,
                ][i],
                failed_attempts: i > 13 ? (i % 4) * 12 + 8 : i % 3,
              })),
        });
      return reply(
        collection(
          dests
            .filter(
              (d) =>
                !url.searchParams.get("destination_id") ||
                url.searchParams.get("destination_id") === d.id,
            )
            .map((d, i) => ({
              destination_id: d.id,
              destination_name: d.name,
              namespace_name: namespace.name,
              status: d.status,
              delivered: [1102, 1213, 1106][i],
              pending: [4, 3, 5][i],
              retry_scheduled: [26, 0, 12][i],
              in_flight: i === 0 ? 2 : 0,
              permanent_failed: i === 0 ? 7 : 0,
              last_error: i === 0 ? "Conexão recusada · 10.8.0.2:9000" : null,
              last_error_at: i === 0 ? webhookEvent.received_at : null,
            })),
        ),
      );
    }
    if (path === "/namespaces" && method === "GET")
      return reply(
        collection(
          namespaces.filter(
            (ns) =>
              !url.searchParams.get("status") ||
              ns.status === url.searchParams.get("status"),
          ),
        ),
      );
    if (path === "/namespaces" && method === "POST") {
      const body = request.postDataJSON();
      const created = {
        ...namespace,
        ...body,
        id: "ns-new",
        has_ingress_secret: Boolean(body.ingress_secret),
        ingress_url: `https://relay.example.test/${body.slug}`,
        destination_count: 0,
      };
      namespaces.push(created);
      return reply(created, 201);
    }
    if (/^\/namespaces\/[^/]+$/.test(path)) {
      const item = namespaces.find((ns) => path.endsWith(ns.id));
      if (!item) return problem(404, "Namespace não encontrado.");
      if (method === "PATCH") Object.assign(item, request.postDataJSON());
      return reply(item);
    }
    if (/^\/namespaces\/[^/]+\/destinations$/.test(path) && method === "POST") {
      const item = {
        ...dests[0],
        ...request.postDataJSON(),
        id: "dst-new",
        namespace_id: path.split("/")[2],
        status: "active",
        created_at: namespace.created_at,
      };
      dests.push(item);
      return reply(item, 201);
    }
    if (path === "/destinations")
      return reply(
        collection(
          dests.filter(
            (d) =>
              !url.searchParams.get("namespace_id") ||
              d.namespace_id === url.searchParams.get("namespace_id"),
          ),
        ),
      );
    if (/^\/destinations\/[^/]+$/.test(path)) {
      const item = dests.find((d) => path.endsWith(d.id));
      if (!item) return problem(404, "Destino não encontrado.");
      if (method === "PATCH") Object.assign(item, request.postDataJSON());
      return reply(item);
    }
    if (path === "/events")
      return reply(
        options.empty
          ? collection([])
          : url.searchParams.has("cursor")
            ? collection([{ ...webhookEvent, id: "evt-second-page" }])
            : { items: [webhookEvent], next_cursor: "page-two" },
      );
    if (path.endsWith("/payload"))
      return route.fulfill({
        body: fixturePayload,
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Payload-Truncated": "false",
        },
      });
    if (path.endsWith("/replays"))
      return reply({ delivery_ids: ["delivery-replay-new"] }, 201);
    if (path.startsWith("/events/"))
      return reply({
        event: webhookEvent,
        headers: [
          { name: "content-type", value: "application/json", redacted: false },
          { name: "x-tag", value: "one", redacted: false },
          { name: "x-tag", value: "two", redacted: false },
          { name: "x-hub-signature-256", value: "[redacted]", redacted: true },
        ],
        deliveries: dests.map((d, i) => ({
          id: `delivery-${i}`,
          event_id: webhookEvent.id,
          destination_id: d.id,
          destination_name: d.name,
          state: ["retry_scheduled", "succeeded", "pending"][i],
          cycle: 1,
          replay_of: null,
          attempts_started: i === 0 ? 3 : i === 1 ? 1 : 0,
          max_retries: d.max_retries,
          retry_interval_seconds: d.retry_interval_seconds,
          timeout_seconds: d.timeout_seconds,
          next_attempt_at: i === 0 ? "2026-10-24T14:17:40Z" : null,
          completed_at: i === 1 ? webhookEvent.received_at : null,
          last_error: i === 0 ? "Conexão recusada" : null,
        })),
      });
    if (path.startsWith("/deliveries/"))
      return reply(
        collection([
          {
            id: "attempt-one",
            number: 3,
            started_at: webhookEvent.received_at,
            finished_at: webhookEvent.received_at,
            url: dests[0]?.url,
            outcome: "failed",
            status_code: 503,
            duration_ms: 15020,
            error_category: "http_status",
            error_message: "HTTP 503 Service Unavailable",
            response_excerpt: "<h1>Serviço indisponível</h1>",
          },
        ]),
      );
    if (path === "/tokens" && method === "GET")
      return reply(collection(tokens));
    if (path === "/tokens" && method === "POST") {
      const token = {
        ...exampleToken,
        ...request.postDataJSON(),
        id: "token-new",
        last_used_at: null,
      };
      tokens.push(token);
      return reply(
        { token, secret: "whf_SYNTHETIC_PLAYWRIGHT_VALUE_NOT_A_CREDENTIAL" },
        201,
      );
    }
    if (path.startsWith("/tokens/") && method === "DELETE") {
      const token = tokens.find((t) => path.endsWith(t.id));
      if (token) token.revoked_at = new Date().toISOString();
      return route.fulfill({ status: 204 });
    }
    return problem(404, `Rota não implementada no fixture: ${method} ${path}`);
  });
  return { requests, session };
}
