import type {
  ApiProblem,
  Attempt,
  CreatedToken,
  Destination,
  DestinationInput,
  DestinationStats,
  EventDetail,
  Namespace,
  NamespaceInput,
  Page,
  Params,
  Session,
  Summary,
  Timeseries,
  Token,
  WebhookEvent,
} from "./contracts";

const ROOT = "/api/v1";
let csrfToken: string | null = null; // In memory only. The session cookie stays HttpOnly.
export const setCsrf = (value: string | null) => {
  csrfToken = value;
};
export class ApiError extends Error {
  constructor(
    public status: number,
    public problem: ApiProblem["error"],
  ) {
    super(problem.message);
  }
}
export function query(params: Params = {}) {
  const result = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") result.set(key, String(value));
  });
  return result.size ? `?${result}` : "";
}
async function response(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  if (init.method && !["GET", "HEAD"].includes(init.method) && csrfToken)
    headers.set("X-CSRF-Token", csrfToken);
  let res: Response;
  try {
    res = await fetch(`${ROOT}${path}`, {
      ...init,
      headers,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, {
      code: "network",
      message:
        "Não foi possível conectar à API. Verifique a conexão e tente novamente.",
    });
  }
  if (!res.ok) {
    const problem = (await res.json().catch(() => null)) as ApiProblem | null;
    if (res.status === 401 && path !== "/auth/login" && path !== "/auth/me")
      window.dispatchEvent(new Event("session-expired"));
    throw new ApiError(
      res.status,
      problem?.error ?? {
        code: "http_error",
        message:
          res.status === 401
            ? "Sessão expirada. Entre novamente."
            : `A API retornou erro ${res.status}. Tente novamente.`,
      },
    );
  }
  return res;
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await response(path, init);
  return res.status === 204 ? (undefined as T) : (res.json() as Promise<T>);
}
const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
});
const id = encodeURIComponent;
export const api = {
  me: (signal?: AbortSignal) => request<Session>("/auth/me", { signal }),
  login: (username: string, password: string) =>
    request<Session>("/auth/login", json("POST", { username, password })),
  logout: () => request<void>("/auth/logout", json("POST")),
  namespaces: (params?: Params, signal?: AbortSignal) =>
    request<Page<Namespace>>(`/namespaces${query(params)}`, { signal }),
  namespace: (key: string, signal?: AbortSignal) =>
    request<Namespace>(`/namespaces/${id(key)}`, { signal }),
  createNamespace: (body: NamespaceInput) =>
    request<Namespace>("/namespaces", json("POST", body)),
  updateNamespace: (
    key: string,
    body: NamespaceInput | { status: "archived" },
  ) => request<Namespace>(`/namespaces/${id(key)}`, json("PATCH", body)),
  destinations: (params?: Params, signal?: AbortSignal) =>
    request<Page<Destination>>(`/destinations${query(params)}`, { signal }),
  destination: (key: string, signal?: AbortSignal) =>
    request<Destination>(`/destinations/${id(key)}`, { signal }),
  createDestination: (namespaceId: string, body: DestinationInput) =>
    request<Destination>(
      `/namespaces/${id(namespaceId)}/destinations`,
      json("POST", body),
    ),
  updateDestination: (
    key: string,
    body: DestinationInput | { status: "active" | "paused" | "archived" },
  ) => request<Destination>(`/destinations/${id(key)}`, json("PATCH", body)),
  events: (params: Params, signal?: AbortSignal) =>
    request<Page<WebhookEvent>>(`/events${query(params)}`, { signal }),
  event: (key: string, signal?: AbortSignal) =>
    request<EventDetail>(`/events/${id(key)}`, { signal }),
  attempts: (key: string, params?: Params, signal?: AbortSignal) =>
    request<Page<Attempt>>(`/deliveries/${id(key)}/attempts${query(params)}`, {
      signal,
    }),
  replay: (key: string, destination_ids: string[], idempotencyKey: string) =>
    request<{ delivery_ids: string[] }>(`/events/${id(key)}/replays`, {
      ...json("POST", { destination_ids }),
      headers: { "Idempotency-Key": idempotencyKey },
    }),
  async payload(
    key: string,
    preview = false,
  ): Promise<{ blob: Blob; truncated: boolean }> {
    const res = await response(
      `/events/${id(key)}/payload${preview ? "?preview_bytes=65536" : ""}`,
    );
    return {
      blob: await res.blob(),
      truncated: res.headers.get("X-Payload-Truncated") === "true",
    };
  },
  tokens: (params?: Params, signal?: AbortSignal) =>
    request<Page<Token>>(`/tokens${query(params)}`, { signal }),
  createToken: (body: { name: string; expires_at: string | null }) =>
    request<CreatedToken>("/tokens", json("POST", body)),
  revokeToken: (key: string) =>
    request<void>(`/tokens/${id(key)}`, json("DELETE")),
  summary: (params: Params, signal?: AbortSignal) =>
    request<Summary>(`/stats/summary${query(params)}`, { signal }),
  timeseries: (params: Params, signal?: AbortSignal) =>
    request<Timeseries>(`/stats/timeseries${query(params)}`, { signal }),
  destinationStats: (params: Params, signal?: AbortSignal) =>
    request<Page<DestinationStats>>(`/stats/destinations${query(params)}`, {
      signal,
    }),
};
