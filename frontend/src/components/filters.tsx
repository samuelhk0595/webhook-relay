import { SlidersHorizontal } from "lucide-react";
import { ErrorNotice, Field } from "./common";
import { useChoices, type FiltersValue } from "../lib/filters";
import { zone } from "../lib/utils";

export function Filters({
  value,
  events = false,
}: {
  value: FiltersValue;
  events?: boolean;
}) {
  const { namespaces, destinations } = useChoices();
  const filtered =
    destinations.data?.filter(
      (destination) => !value.ns || destination.namespace_id === value.ns,
    ) ?? [];
  return (
    <section className="filters" aria-label="Filtros">
      <div className="filter-controls">
        <span className="filter-label">
          <SlidersHorizontal size={17} aria-hidden="true" />
          Filtrar
        </span>
        <Field label="Namespace">
          {(props) => (
            <select
              {...props}
              value={value.ns}
              onChange={(e) => value.change("namespace_id", e.target.value)}
              disabled={namespaces.isPending}
            >
              <option value="">Todos os namespaces</option>
              {namespaces.data?.map((namespace) => (
                <option key={namespace.id} value={namespace.id}>
                  {namespace.name}
                  {namespace.status === "archived" ? " (arquivado)" : ""}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Destino">
          {(props) => (
            <select
              {...props}
              value={value.dst}
              onChange={(e) => value.change("destination_id", e.target.value)}
              disabled={destinations.isPending}
            >
              <option value="">Todos os destinos</option>
              {filtered.map((destination) => (
                <option key={destination.id} value={destination.id}>
                  {destination.name}
                  {destination.status !== "active"
                    ? ` (${destination.status === "paused" ? "pausado" : "arquivado"})`
                    : ""}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Período">
          {(props) => (
            <select
              {...props}
              value={value.range}
              onChange={(e) => value.change("range", e.target.value)}
            >
              <option value="24h">Últimas 24 horas</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="custom">Personalizado</option>
            </select>
          )}
        </Field>
        {events ? (
          <Field label="Estado da entrega">
            {(props) => (
              <select
                {...props}
                value={value.state}
                onChange={(e) => value.change("state", e.target.value)}
              >
                <option value="">Todos os estados</option>
                <option value="pending">Primeira tentativa</option>
                <option value="retry_scheduled">Retry agendado</option>
                <option value="in_flight">Em processamento</option>
                <option value="succeeded">Concluída</option>
                <option value="failed">Falha definitiva</option>
                <option value="cancelled">Cancelada</option>
              </select>
            )}
          </Field>
        ) : null}
      </div>
      {value.range === "custom" ? (
        <div className="custom-range">
          <Field label="De (inclusive)">
            {(props) => (
              <input
                {...props}
                type="datetime-local"
                value={value.fromInput}
                onChange={(e) => value.change("from", e.target.value)}
              />
            )}
          </Field>
          <Field label="Até (exclusive)">
            {(props) => (
              <input
                {...props}
                type="datetime-local"
                value={value.toInput}
                onChange={(e) => value.change("to", e.target.value)}
              />
            )}
          </Field>
          <small>Fuso: {zone}. Limites alinhados ao minuto.</small>
          {!value.valid ? (
            <p className="text-danger" role="alert">
              Informe um início anterior ao fim para consultar.
            </p>
          ) : null}
        </div>
      ) : null}
      {namespaces.error || destinations.error ? (
        <ErrorNotice
          error={namespaces.error ?? destinations.error}
          retry={() => {
            void namespaces.refetch();
            void destinations.refetch();
          }}
        />
      ) : null}
    </section>
  );
}
