import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  Download,
  FileText,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import type { Delivery, WebhookEvent } from "../lib/contracts";
import { useChoices, useFilters } from "../lib/filters";
import { polling, useAction, usePages } from "../lib/queries";
import { bytes, date, number, zone } from "../lib/utils";
import {
  Back,
  CopyButton,
  Empty,
  ErrorNotice,
  Heading,
  Loading,
  More,
  Status,
} from "../components/common";
import { Filters } from "../components/filters";
import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";

export function Events() {
  const filters = useFilters();
  const events = usePages(
    ["events", "list", filters.params, filters.state],
    (cursor, signal) =>
      api.events(
        {
          ...filters.params,
          state: filters.state || undefined,
          cursor,
          limit: 25,
        },
        signal,
      ),
    filters.valid,
  );
  const rows = events.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <>
      <Heading
        title="Eventos"
        description="O recebimento é único. Cada destino tem seu próprio ciclo de entrega."
        actions={
          <Button
            variant="secondary"
            disabled={events.isFetching || !filters.valid}
            onClick={() => {
              void events.refetch();
            }}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Atualizar
          </Button>
        }
      />
      <Filters value={filters} events />
      <div className="list-toolbar">
        <p>Horários em {zone} · atualização a cada 10 s com a tela ativa</p>
        <span>
          {rows.length ? `${number(rows.length)} eventos carregados` : ""}
        </span>
      </div>
      <ErrorNotice
        error={events.error}
        retry={() => {
          void events.refetch();
        }}
      />
      <section className="panel">
        {events.isPending && filters.valid ? (
          <Loading />
        ) : events.data ? (
          rows.length ? (
            <>
              <div className="table-scroll">
                <table>
                  <caption className="sr-only">
                    Eventos recebidos e resultado das entregas
                  </caption>
                  <thead>
                    <tr>
                      <th>Evento / recebimento</th>
                      <th>Namespace</th>
                      <th>Método</th>
                      <th>Corpo</th>
                      <th>Entregas</th>
                      <th>
                        <span className="sr-only">Detalhes</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((event) => (
                      <tr key={event.id}>
                        <td>
                          <Link
                            className="row-link mono"
                            to={`/events/${event.id}`}
                          >
                            {event.id.slice(0, 12)}
                          </Link>
                          <small>{date(event.received_at)}</small>
                        </td>
                        <td>{event.namespace_name}</td>
                        <td>
                          <span className="method">{event.method}</span>
                        </td>
                        <td>
                          {bytes(event.body_size)}
                          <small>
                            {event.content_type ?? "Sem Content-Type"}
                          </small>
                        </td>
                        <td>
                          {event.delivery_count ? (
                            <div className="event-counts">
                              <span>{event.succeeded_count} concluídas</span>
                              {event.pending_count ? (
                                <span className="text-warning">
                                  {event.pending_count} pendentes
                                </span>
                              ) : null}
                              {event.failed_count ? (
                                <span className="text-danger">
                                  {event.failed_count} falhas definitivas
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-muted">
                              Sem destino na entrada
                            </span>
                          )}
                        </td>
                        <td>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/events/${event.id}`}>Inspecionar</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <More
                hasNext={events.hasNextPage}
                pending={events.isFetchingNextPage}
                load={() => {
                  void events.fetchNextPage();
                }}
              />
            </>
          ) : (
            <Empty
              title="Nenhum evento neste recorte"
              description="Ajuste os filtros ou envie um webhook à URL de um namespace cadastrado. Não é preciso que o payload seja JSON."
            />
          )
        ) : null}
      </section>
    </>
  );
}
export function EventDetail() {
  const { id = "" } = useParams();
  const [replayOpen, setReplayOpen] = useState(false);
  const event = useQuery({
    queryKey: ["events", id],
    queryFn: ({ signal }) => api.event(id, signal),
    ...polling,
  });
  const data = event.data;
  return (
    <>
      <Back to="/events">Eventos</Back>
      <Heading
        title="Detalhe do evento"
        description="Payload original, ciclos independentes e o registro de cada tentativa."
        actions={
          data?.event.payload_available ? (
            <Button onClick={() => setReplayOpen(true)}>
              <RotateCcw size={16} aria-hidden="true" />
              Reenviar evento
            </Button>
          ) : null
        }
      />
      <ErrorNotice
        error={event.error}
        retry={() => {
          void event.refetch();
        }}
      />
      {event.isPending ? <Loading /> : null}
      {data ? (
        <>
          <section className="panel event-metadata">
            <div className="event-id">
              <span className="method">{data.event.method}</span>
              <code>{data.event.id}</code>
              <CopyButton
                value={data.event.id}
                label="Copiar ID do evento"
                iconOnly
              />
            </div>
            <dl className="metadata-grid">
              <div>
                <dt>Namespace</dt>
                <dd>
                  <Link
                    className="text-link"
                    to={`/namespaces/${data.event.namespace_id}`}
                  >
                    {data.event.namespace_name}
                  </Link>
                </dd>
              </div>
              <div>
                <dt>Recebido em · {zone}</dt>
                <dd>{date(data.event.received_at)}</dd>
              </div>
              <div>
                <dt>Tamanho original</dt>
                <dd>{bytes(data.event.body_size)}</dd>
              </div>
              <div>
                <dt>Content-Type</dt>
                <dd>{data.event.content_type ?? "Não informado"}</dd>
              </div>
            </dl>
            {data.event.original_query ? (
              <div className="original-query">
                <span>Query original</span>
                <code>{data.event.original_query}</code>
              </div>
            ) : null}
          </section>
          <Payload event={data.event} />
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Headers de aplicação</h2>
                <p>Valores sensíveis mascarados. Repetições são preservadas.</p>
              </div>
            </div>
            {data.headers.length ? (
              <div className="table-scroll">
                <table className="headers-table">
                  <caption className="sr-only">Headers do evento</caption>
                  <thead>
                    <tr>
                      <th>Header</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.headers.map((header, index) => (
                      <tr key={`${header.name}-${index}`}>
                        <td>
                          <code>{header.name}</code>
                        </td>
                        <td>
                          <code>
                            {header.redacted ||
                            /authorization|cookie|token|secret|signature|api-key/i.test(
                              header.name,
                            )
                              ? "•••••••• (sensível)"
                              : header.value}
                          </code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="panel-padding text-muted">
                Nenhum header retido.
              </div>
            )}
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Entregas e tentativas</h2>
                <p>
                  Reenvios criam novos ciclos. Resultados históricos não são
                  apagados.
                </p>
              </div>
              <span className="subtle-tag">
                {data.deliveries.length} ciclos
              </span>
            </div>
            {data.deliveries.length ? (
              <div className="deliveries">
                {data.deliveries.map((delivery) => (
                  <DeliveryItem key={delivery.id} delivery={delivery} />
                ))}
              </div>
            ) : (
              <Empty
                title="Recebido sem destinos"
                description="O evento foi guardado. Adicione um destino ao namespace e use Reenviar evento para criar uma entrega manualmente."
              />
            )}
          </section>
          {!data.event.payload_available ? (
            <div className="notice notice-warning">
              O payload não está mais disponível pela política de retenção. O
              histórico agregado permanece; reenvio e download não são
              possíveis.
            </div>
          ) : null}
          <ReplayDialog
            key={replayOpen ? "open" : "closed"}
            open={replayOpen}
            onOpenChange={setReplayOpen}
            event={data.event}
          />
        </>
      ) : null}
    </>
  );
}
function Payload({ event }: { event: WebhookEvent }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [busy, setBusy] = useState<"preview" | "download" | null>(null);
  const [error, setError] = useState<unknown>(null);
  const textual =
    /^(text\/|application\/(?:json|xml|javascript|x-www-form-urlencoded|[^;]+\+(?:json|xml)))/i.test(
      event.content_type ?? "",
    );
  async function load(download = false) {
    setError(null);
    setBusy(download ? "download" : "preview");
    try {
      const result = await api.payload(event.id, !download);
      if (download) {
        // Never navigate to remote content or render it in an iframe. Force a local attachment.
        const objectURL = URL.createObjectURL(
          new Blob([result.blob], { type: "application/octet-stream" }),
        );
        const anchor = document.createElement("a");
        anchor.href = objectURL;
        anchor.download = `event-${event.id.replace(/[^a-zA-Z0-9_-]/g, "_")}.bin`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectURL), 60000);
        toast.success("Download do payload iniciado.");
      } else {
        const buffer = await result.blob.arrayBuffer();
        if (buffer.byteLength > 65536)
          throw new Error(
            "A API excedeu o limite da prévia. Use o download para inspecionar o arquivo.",
          );
        const text = new TextDecoder("utf-8", {
          fatal: !result.truncated,
        }).decode(buffer);
        if (text.includes("\u0000"))
          throw new Error(
            "O corpo contém bytes binários. Use o download seguro.",
          );
        setPreview(text);
        setTruncated(result.truncated);
      }
    } catch (err) {
      setError(
        err instanceof TypeError
          ? new Error(
              "Conteúdo não é texto UTF-8. Use o download seguro para inspecionar os bytes originais.",
            )
          : err,
      );
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Payload original</h2>
          <p>
            {textual
              ? "Prévia escapada, sem formatar ou executar o conteúdo recebido."
              : "Conteúdo binário ou tipo não textual. Disponível apenas como download seguro."}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {textual && event.payload_available ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={Boolean(busy)}
              onClick={() => {
                if (preview !== null) setPreview(null);
                else void load();
              }}
            >
              <FileText size={15} aria-hidden="true" />
              {busy === "preview"
                ? "Carregando…"
                : preview !== null
                  ? "Ocultar prévia"
                  : "Ver prévia textual"}
            </Button>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            disabled={Boolean(busy) || !event.payload_available}
            onClick={() => {
              void load(true);
            }}
          >
            <Download size={15} aria-hidden="true" />
            {busy === "download" ? "Baixando…" : "Baixar bytes"}
          </Button>
        </div>
      </div>
      <ErrorNotice error={error} />
      {preview !== null ? (
        <>
          <pre className="payload">
            <code>{preview || "(corpo vazio)"}</code>
          </pre>
          {truncated ? (
            <p className="panel-footnote">
              Prévia limitada a 64 KiB. O download contém o corpo completo, sem
              conversão.
            </p>
          ) : null}
        </>
      ) : (
        <div className="payload-placeholder">
          {event.payload_available
            ? `${bytes(event.body_size)} · O payload só é carregado ao solicitar a prévia ou o download.`
            : "Payload indisponível pela retenção."}
        </div>
      )}
    </section>
  );
}
function DeliveryItem({ delivery }: { delivery: Delivery }) {
  const [open, setOpen] = useState(false);
  const attempts = usePages(
    ["attempts", delivery.id],
    (cursor, signal) =>
      api.attempts(delivery.id, { cursor, limit: 20 }, signal),
    open,
  );
  const rows = attempts.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <details
      className="delivery-item"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        <div>
          <Link
            to={`/destinations/${delivery.destination_id}`}
            className="row-link"
            onClick={(e) => e.stopPropagation()}
          >
            {delivery.destination_name}
          </Link>
          <span className="delivery-cycle">
            Ciclo {delivery.cycle} · {delivery.attempts_started}/
            {delivery.max_retries === null ? "∞" : delivery.max_retries + 1}{" "}
            tentativas
          </span>
        </div>
        <Status value={delivery.state} />
        <ChevronDown size={16} aria-hidden="true" />
      </summary>
      <div className="delivery-body">
        <dl className="metadata-grid">
          <div>
            <dt>ID da entrega</dt>
            <dd className="mono break-url">{delivery.id}</dd>
          </div>
          <div>
            <dt>Próxima tentativa</dt>
            <dd>{date(delivery.next_attempt_at)}</dd>
          </div>
          <div>
            <dt>Intervalo / timeout copiados</dt>
            <dd>
              {delivery.retry_interval_seconds} s / {delivery.timeout_seconds} s
            </dd>
          </div>
          <div>
            <dt>Concluída em</dt>
            <dd>{date(delivery.completed_at)}</dd>
          </div>
        </dl>
        {delivery.replay_of ? (
          <p className="text-muted break-url">
            Novo ciclo ligado à entrega {delivery.replay_of}.
          </p>
        ) : null}
        {delivery.last_error ? (
          <p className="last-error">
            <strong>Último erro:</strong> {delivery.last_error}
          </p>
        ) : null}
        <ErrorNotice
          error={attempts.error}
          retry={() => {
            void attempts.refetch();
          }}
        />
        {open && attempts.isPending ? (
          <Loading label="Carregando tentativas…" />
        ) : null}
        {attempts.data ? (
          rows.length ? (
            <>
              <div className="attempt-list">
                {rows.map((attempt) => (
                  <article key={attempt.id} className="attempt">
                    <div className="attempt-heading">
                      <strong>Tentativa {attempt.number}</strong>
                      <Status
                        value={attempt.outcome}
                        label={
                          attempt.outcome === "failed"
                            ? "Tentativa com falha"
                            : attempt.outcome === "succeeded"
                              ? "Tentativa concluída"
                              : undefined
                        }
                      />
                      <span>{date(attempt.started_at)}</span>
                      <span>
                        {attempt.status_code
                          ? `HTTP ${attempt.status_code}`
                          : "Sem status HTTP"}{" "}
                        ·{" "}
                        {attempt.duration_ms === null
                          ? "Duração desconhecida"
                          : `${number(attempt.duration_ms)} ms`}
                      </span>
                    </div>
                    <dl>
                      <dt>URL usada</dt>
                      <dd className="mono break-url">{attempt.url}</dd>
                    </dl>
                    {attempt.outcome === "interrupted" ? (
                      <p className="text-warning">
                        Interrompida: o destino pode ter processado a chamada.
                        Consome uma tentativa, mas não entra na taxa de falha
                        conhecida.
                      </p>
                    ) : null}
                    {attempt.error_message ? (
                      <p className="text-danger break-url">
                        {attempt.error_category}: {attempt.error_message}
                      </p>
                    ) : null}
                    {attempt.response_excerpt ? (
                      <details>
                        <summary>Trecho da resposta (limitado)</summary>
                        <pre className="response-excerpt">
                          {attempt.response_excerpt}
                        </pre>
                      </details>
                    ) : null}
                  </article>
                ))}
              </div>
              <More
                hasNext={attempts.hasNextPage}
                pending={attempts.isFetchingNextPage}
                load={() => {
                  void attempts.fetchNextPage();
                }}
              />
            </>
          ) : (
            <p className="text-muted">
              {delivery.attempts_started > 0
                ? "Os diagnósticos antigos de tentativas foram removidos pela retenção. O resultado do ciclo permanece no histórico."
                : "Aguardando a primeira tentativa. Destinos pausados continuam acumulando fila."}
            </p>
          )
        ) : null}
      </div>
    </details>
  );
}
function ReplayDialog({
  open,
  onOpenChange,
  event,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: WebhookEvent;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const { destinations } = useChoices();
  const eligible =
    destinations.data?.filter(
      (destination) =>
        destination.namespace_id === event.namespace_id &&
        destination.status !== "archived",
    ) ?? [];
  const action = useAction(
    () => api.replay(event.id, selected, idempotencyKey),
    "Novo ciclo de entrega criado. O histórico anterior foi preservado.",
  );
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!action.isPending) onOpenChange(value);
      }}
      title="Reenviar evento"
      description="Selecione os destinos do mesmo namespace. Cada seleção cria um novo ciclo com a política atual e contador zerado; falhas anteriores permanecem no histórico."
    >
      <ErrorNotice
        error={destinations.error}
        retry={() => {
          void destinations.refetch();
        }}
      />
      <ErrorNotice error={action.error} />
      {destinations.isPending ? (
        <Loading />
      ) : eligible.length ? (
        <fieldset className="replay-options">
          <legend>Destinos do novo ciclo</legend>
          {eligible.map((destination) => (
            <label key={destination.id}>
              <input
                type="checkbox"
                checked={selected.includes(destination.id)}
                disabled={action.isPending}
                onChange={(e) =>
                  setSelected((values) =>
                    e.target.checked
                      ? [...values, destination.id]
                      : values.filter((value) => value !== destination.id),
                  )
                }
              />
              <span>
                <strong>{destination.name}</strong>
                <small className="break-url">{destination.url}</small>
              </span>
              <Status value={destination.status} />
            </label>
          ))}
        </fieldset>
      ) : (
        <Empty
          title="Nenhum destino disponível"
          description="Adicione um destino não arquivado ao namespace antes de reenviar."
        />
      )}
      <p className="notice notice-warning">
        Reenvios podem duplicar processamento no receptor. Destinos pausados
        aguardam retomada. A mesma chave idempotente será mantida se você tentar
        novamente após um erro.
      </p>
      <div className="dialog-actions">
        <Button
          variant="secondary"
          disabled={action.isPending}
          onClick={() => onOpenChange(false)}
        >
          Cancelar
        </Button>
        <Button
          disabled={
            !selected.length || action.isPending || !event.payload_available
          }
          onClick={() => {
            void action
              .mutateAsync(undefined)
              .then(() => onOpenChange(false))
              .catch(() => {});
          }}
        >
          {action.isPending
            ? "Criando ciclos…"
            : `Reenviar para ${selected.length} ${selected.length === 1 ? "destino" : "destinos"}`}
        </Button>
      </div>
    </Dialog>
  );
}
