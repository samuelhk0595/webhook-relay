import { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowUpRight,
  CheckCheck,
  CircleAlert,
  Clock3,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useFilters } from "../lib/filters";
import { polling, usePages } from "../lib/queries";
import { clock, date, duration, number, zone } from "../lib/utils";
import {
  Empty,
  ErrorNotice,
  Heading,
  Loading,
  More,
  Status,
} from "../components/common";
import { Filters } from "../components/filters";
import { Button } from "../components/ui/button";

const TrafficChart = lazy(() => import("../components/traffic-chart"));
export default function Dashboard() {
  const filters = useFilters();
  const summary = useQuery({
    queryKey: ["stats", "summary", filters.params],
    queryFn: ({ signal }) => api.summary(filters.params, signal),
    enabled: filters.valid,
    ...polling,
  });
  const series = useQuery({
    queryKey: ["stats", "series", filters.params],
    queryFn: ({ signal }) => api.timeseries(filters.params, signal),
    enabled: filters.valid,
    ...polling,
  });
  const destinations = usePages(
    ["stats", "destinations", filters.params],
    (cursor, signal) =>
      api.destinationStats({ ...filters.params, limit: 20, cursor }, signal),
    filters.valid,
  );
  const data = summary.data;
  const rows = destinations.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <>
      <Heading
        title="Visão geral"
        description="Do recebimento à última tentativa, com o histórico no lugar."
        actions={
          <Button asChild>
            <Link to="/events">
              Ver eventos
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </Button>
        }
      />
      <Filters value={filters} />
      <div className="update-row">
        <span className="live-mark">
          <span aria-hidden="true" />
          Atualização a cada 10 s com a tela ativa
        </span>
        <span className="update-time" key={summary.dataUpdatedAt}>
          {summary.isFetching
            ? "Atualizando…"
            : summary.dataUpdatedAt
              ? `Atualizado às ${clock(summary.dataUpdatedAt)}`
              : "Aguardando API"}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Atualizar painel"
            disabled={!filters.valid || summary.isFetching}
            onClick={() => {
              void summary.refetch();
              void series.refetch();
              void destinations.refetch();
            }}
          >
            <RefreshCw size={14} aria-hidden="true" />
          </Button>
        </span>
      </div>
      <ErrorNotice
        error={summary.error}
        retry={() => {
          void summary.refetch();
        }}
      />
      {filters.valid && summary.isPending ? (
        <Loading label="Carregando indicadores…" />
      ) : null}
      {data ? (
        <>
          <div className="metrics">
            <article className="metric">
              <div>
                <h2>Recebidos</h2>
                <ArrowDownToLine size={18} aria-hidden="true" />
              </div>
              <strong>{number(data.received)}</strong>
              <p>eventos persistidos</p>
            </article>
            <article className="metric">
              <div>
                <h2>Entregas concluídas</h2>
                <CheckCheck
                  size={18}
                  className="text-success"
                  aria-hidden="true"
                />
              </div>
              <strong>{number(data.delivered)}</strong>
              <p>ciclos finalizados com sucesso</p>
            </article>
            <article
              className={`metric ${data.permanent_failed ? "metric-critical" : ""}`}
            >
              <div>
                <h2>Falhas definitivas</h2>
                <CircleAlert size={18} aria-hidden="true" />
              </div>
              <strong>{number(data.permanent_failed)}</strong>
              <p>ciclos sem tentativas restantes</p>
            </article>
            <article className="metric">
              <div>
                <h2>Taxa de falha</h2>
                <span className="text-muted">%</span>
              </div>
              <strong>
                {data.failure_rate === null
                  ? "Sem dados"
                  : `${(data.failure_rate * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
              </strong>
              <p>
                {number(data.failed_attempts)} falhas /{" "}
                {number(data.finalized_attempts)} tentativas conhecidas
              </p>
            </article>
          </div>
          <p className="metric-note">
            1 webhook para 3 destinos = 1 recebido e 3 entregas.
            {filters.dst
              ? " O filtro de destino afeta entregas; recebidos continuam sendo do namespace/global."
              : ""}
          </p>
          <section className="queue-panel" aria-labelledby="queue-title">
            <div className="queue-heading">
              <div>
                <h2 id="queue-title">Fila agora</h2>
                <p>Estado atual, independente do período</p>
              </div>
              <Clock3 size={19} aria-hidden="true" />
            </div>
            <div className="queue-values">
              <div>
                <span>
                  <i className="state-dot blue" />
                  Primeira tentativa
                </span>
                <strong>{number(data.queue.pending)}</strong>
              </div>
              <div>
                <span>
                  <i className="state-dot amber" />
                  Aguardando retry
                </span>
                <strong>{number(data.queue.retry_scheduled)}</strong>
              </div>
              <div>
                <span>
                  <i className="state-dot teal" />
                  Em processamento
                </span>
                <strong>{number(data.queue.in_flight)}</strong>
              </div>
              <div>
                <span>Pendência mais antiga</span>
                <strong className="age-value">
                  {duration(data.queue.oldest_pending_age_seconds)}
                </strong>
              </div>
            </div>
            {data.queue.paused > 0 ? (
              <div className="queue-paused">
                {number(data.queue.paused)} pendências em destinos pausados.
                Retomar preserva a fila e o contador.
              </div>
            ) : null}
          </section>
        </>
      ) : null}
      <section className="panel" aria-labelledby="traffic-title">
        <div className="panel-heading">
          <div>
            <h2 id="traffic-title">Atividade no período</h2>
            <p>
              Eventos, ciclos de entrega e tentativas são unidades diferentes.
            </p>
          </div>
          <span className="subtle-tag">{zone}</span>
        </div>
        <ErrorNotice
          error={series.error}
          retry={() => {
            void series.refetch();
          }}
        />
        {filters.valid && series.isPending ? (
          <Loading label="Carregando gráfico…" />
        ) : null}
        {series.data ? (
          series.data.points.length ? (
            <Suspense fallback={<Loading label="Preparando gráfico…" />}>
              <TrafficChart points={series.data.points} />
            </Suspense>
          ) : (
            <Empty
              title="Ainda sem atividade neste período"
              description="Os primeiros recebimentos e resultados de entrega aparecerão aqui. Ajuste os filtros ou cadastre um namespace para começar."
            />
          )
        ) : null}
        {series.data ? (
          <div className="panel-footnote">
            Intervalo efetivo: {date(series.data.period.from)} até{" "}
            {date(series.data.period.to)} (fim exclusivo) · agrupamento:{" "}
            {
              { minute: "minuto", hour: "hora", day: "dia" }[
                series.data.period.granularity
              ]
            }
          </div>
        ) : null}
      </section>
      <section className="panel" aria-labelledby="destination-title">
        <div className="panel-heading">
          <div>
            <h2 id="destination-title">Diagnóstico por destino</h2>
            <p>Resultados do período e pendências atuais, lado a lado.</p>
          </div>
          <Link className="text-link" to="/namespaces">
            Gerenciar destinos
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <ErrorNotice
          error={destinations.error}
          retry={() => {
            void destinations.refetch();
          }}
        />
        {filters.valid && destinations.isPending ? <Loading /> : null}
        {destinations.data ? (
          rows.length ? (
            <>
              <div className="table-scroll">
                <table>
                  <caption className="sr-only">
                    Entregas, fila e último erro por destino
                  </caption>
                  <thead>
                    <tr>
                      <th>Destino</th>
                      <th>Estado</th>
                      <th className="numeric">Concluídas</th>
                      <th className="numeric">Fila / retry</th>
                      <th className="numeric">Falhas definitivas</th>
                      <th>Último erro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.destination_id}>
                        <td>
                          <Link
                            className="row-link"
                            to={`/destinations/${row.destination_id}`}
                          >
                            {row.destination_name}
                          </Link>
                          <small>{row.namespace_name}</small>
                        </td>
                        <td>
                          <Status value={row.status} />
                        </td>
                        <td className="numeric">{number(row.delivered)}</td>
                        <td className="numeric">
                          {number(row.pending + row.in_flight)} /{" "}
                          {number(row.retry_scheduled)}
                        </td>
                        <td
                          className={`numeric ${row.permanent_failed ? "text-danger" : ""}`}
                        >
                          {number(row.permanent_failed)}
                        </td>
                        <td className="error-cell">
                          {row.last_error ? (
                            <>
                              <span>{row.last_error}</span>
                              <small>{date(row.last_error_at)}</small>
                            </>
                          ) : (
                            <span className="text-muted">
                              Nenhum erro registrado
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <More
                hasNext={destinations.hasNextPage}
                pending={destinations.isFetchingNextPage}
                load={() => {
                  void destinations.fetchNextPage();
                }}
              />
            </>
          ) : (
            <Empty
              title="Nenhum destino encontrado"
              description="Cadastre um destino dentro de um namespace para acompanhar suas entregas."
            >
              <Button variant="secondary" asChild>
                <Link to="/namespaces">Configurar namespaces</Link>
              </Button>
            </Empty>
          )
        ) : null}
      </section>
    </>
  );
}
