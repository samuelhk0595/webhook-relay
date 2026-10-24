import { useState, type FormEvent } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Archive, ArrowUpRight, Pause, Play } from "lucide-react";
import { api, ApiError } from "../lib/api";
import type { Destination, DestinationInput } from "../lib/contracts";
import { useChoices } from "../lib/filters";
import { useAction } from "../lib/queries";
import { duration } from "../lib/utils";
import {
  Back,
  ErrorNotice,
  Field,
  Heading,
  Loading,
  Status,
} from "../components/common";
import { Button } from "../components/ui/button";
import { Confirm } from "../components/ui/dialog";

export default function DestinationEditor() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const result = useQuery({
    queryKey: ["destinations", id],
    queryFn: ({ signal }) => api.destination(id!, signal),
    enabled: Boolean(id),
  });
  const back = result.data?.namespace_id ?? search.get("namespace_id");
  return (
    <>
      <Back to={back ? `/namespaces/${back}` : "/namespaces"}>
        Voltar ao namespace
      </Back>
      <Heading
        title={
          id ? (result.data?.name ?? "Configurar destino") : "Novo destino"
        }
        description="Cada destino tem sua própria fila, intervalo e orçamento de tentativas."
      />
      <ErrorNotice
        error={result.error}
        retry={() => {
          void result.refetch();
        }}
      />
      {id && result.isPending ? (
        <Loading />
      ) : !id || result.data ? (
        <DestinationForm
          key={result.data?.id ?? "new"}
          destination={result.data}
          initialNamespace={search.get("namespace_id") ?? ""}
        />
      ) : null}
    </>
  );
}
function DestinationForm({
  destination,
  initialNamespace,
}: {
  destination?: Destination;
  initialNamespace: string;
}) {
  const [namespaceId, setNamespaceId] = useState(
    destination?.namespace_id ?? initialNamespace,
  );
  const [name, setName] = useState(destination?.name ?? "");
  const [url, setUrl] = useState(destination?.url ?? "");
  const [unlimited, setUnlimited] = useState(destination?.max_retries === null);
  const [retries, setRetries] = useState(
    String(destination?.max_retries ?? 288),
  );
  const [interval, setIntervalValue] = useState(
    String(destination?.retry_interval_seconds ?? 300),
  );
  const [timeout, setTimeoutValue] = useState(
    String(destination?.timeout_seconds ?? 15),
  );
  const [confirm, setConfirm] = useState<"archive" | "pause" | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const choices = useChoices();
  const navigate = useNavigate();
  const save = useAction(
    (body: DestinationInput) =>
      destination
        ? api.updateDestination(destination.id, body)
        : api.createDestination(namespaceId, body),
    "Destino salvo.",
  );
  const change = useAction(
    (status: "active" | "paused" | "archived") =>
      api.updateDestination(destination!.id, { status }),
    "Estado do destino atualizado.",
  );
  const fields =
    save.error instanceof ApiError ? save.error.problem.fields : undefined;
  const archived = destination?.status === "archived";
  const status = change.data?.status ?? destination?.status;
  const locked = archived || status === "archived";
  async function submit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    try {
      const parsed = new URL(url);
      if (
        !["http:", "https:"].includes(parsed.protocol) ||
        parsed.username ||
        parsed.password
      ) {
        setLocalError(
          "Use uma URL HTTP ou HTTPS sem usuário ou senha embutidos.",
        );
        return;
      }
    } catch {
      setLocalError("Informe uma URL HTTP ou HTTPS absoluta válida.");
      return;
    }
    try {
      const result = await save.mutateAsync({
        name,
        url,
        max_retries: unlimited ? null : Number(retries),
        retry_interval_seconds: Number(interval),
        timeout_seconds: Number(timeout),
      });
      navigate(`/destinations/${result.id}`);
    } catch {
      /* Keep the form. */
    }
  }
  return (
    <>
      <div className="destination-actions">
        {status ? (
          <Status value={status} />
        ) : (
          <span className="text-muted">Criado como ativo</span>
        )}
        {destination && !locked ? (
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="secondary"
              disabled={change.isPending}
              onClick={() => {
                change.reset();
                if (status === "paused")
                  void change.mutateAsync("active").catch(() => {});
                else setConfirm("pause");
              }}
            >
              {status === "paused" ? (
                <Play size={15} aria-hidden="true" />
              ) : (
                <Pause size={15} aria-hidden="true" />
              )}
              {status === "paused" ? "Retomar entregas" : "Pausar entregas"}
            </Button>
            <Link
              className="text-link"
              to={`/events?namespace_id=${namespaceId}&destination_id=${destination.id}`}
            >
              Ver eventos
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
        ) : null}
      </div>
      {status === "paused" ? (
        <div className="notice notice-warning">
          Este destino continua acumulando fila. Ao retomar, as entregas
          preservam seus contadores. Uma tentativa já em andamento pode
          terminar.
        </div>
      ) : null}
      {locked ? (
        <div className="notice notice-info">
          Destino arquivado: sem novas inscrições, pendências canceladas e
          histórico preservado. Uma tentativa já em andamento pode terminar.
        </div>
      ) : null}
      <ErrorNotice error={change.error} />
      <form
        className="form-panel"
        onSubmit={(event) => {
          void submit(event);
        }}
      >
        <ErrorNotice
          error={save.error ?? (localError ? new Error(localError) : null)}
        />
        <div className="form-section">
          <h2>Conexão</h2>
          {!destination ? (
            <>
              <ErrorNotice
                error={choices.namespaces.error}
                retry={() => {
                  void choices.namespaces.refetch();
                }}
              />
              <Field label="Namespace">
                {(props) => (
                  <select
                    {...props}
                    required
                    value={namespaceId}
                    onChange={(e) => setNamespaceId(e.target.value)}
                    disabled={choices.namespaces.isPending}
                  >
                    <option value="">Selecione um namespace</option>
                    {choices.namespaces.data
                      ?.filter((ns) => ns.status === "active")
                      .map((ns) => (
                        <option key={ns.id} value={ns.id}>
                          {ns.name}
                        </option>
                      ))}
                  </select>
                )}
              </Field>
            </>
          ) : null}
          <Field label="Nome do destino" error={fields?.name}>
            {(props) => (
              <input
                {...props}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                required
                placeholder="Ex.: Computador de casa"
                disabled={locked}
              />
            )}
          </Field>
          <Field
            label="URL de destino"
            hint="HTTP/HTTPS. Redes privadas via VPN são permitidas; o endereço precisa ser alcançável pela VPS."
            error={fields?.url}
          >
            {(props) => (
              <input
                {...props}
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                maxLength={4096}
                placeholder="http://10.0.0.2:9000/webhook"
                disabled={locked}
              />
            )}
          </Field>
          {destination ? (
            <p className="notice notice-info">
              A próxima tentativa usará a URL atual, inclusive para entregas que
              já estão na fila. Cada tentativa registra o endereço usado.
            </p>
          ) : (
            <p className="text-muted">
              Este destino receberá apenas novos eventos. Para eventos
              anteriores, use o reenvio manual.
            </p>
          )}
        </div>
        <div className="form-section">
          <h2>Política de entrega</h2>
          <p>
            {destination
              ? "Alterações de retries, intervalo e timeout valem apenas para novas entregas. As pendentes mantêm a política copiada ao serem criadas."
              : "A política será copiada para cada nova entrega. Uma falha neste destino não repete entregas concluídas em outros."}
          </p>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={unlimited}
              onChange={(e) => setUnlimited(e.target.checked)}
              disabled={locked}
            />
            Retries ilimitados
          </label>
          <div className="form-grid">
            <Field
              label="Máximo de retries"
              hint="0 = só a tentativa inicial. N = N + 1 tentativas totais."
              error={fields?.max_retries}
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  value={retries}
                  onChange={(e) => setRetries(e.target.value)}
                  min={0}
                  max={1000000}
                  step={1}
                  required={!unlimited}
                  disabled={unlimited || locked}
                />
              )}
            </Field>
            <Field
              label="Intervalo fixo (segundos)"
              hint="Contado após o término da tentativa anterior."
              error={fields?.retry_interval_seconds}
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  value={interval}
                  onChange={(e) => setIntervalValue(e.target.value)}
                  min={1}
                  max={604800}
                  step={1}
                  required
                  disabled={locked}
                />
              )}
            </Field>
            <Field
              label="Timeout (segundos)"
              hint="Tempo máximo de cada chamada HTTP."
              error={fields?.timeout_seconds}
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  value={timeout}
                  onChange={(e) => setTimeoutValue(e.target.value)}
                  min={1}
                  max={300}
                  step={1}
                  required
                  disabled={locked}
                />
              )}
            </Field>
          </div>
          <div className="policy-preview">
            {unlimited
              ? "Sem limite de tentativas. Pausas ou indisponibilidade prolongada podem aumentar o armazenamento."
              : Number(retries) === 0
                ? "Uma única tentativa, sem retry automático."
                : `Até ${(Number(retries) + 1).toLocaleString("pt-BR")} tentativas por ciclo. Janela aproximada de espera: ${duration(Number(retries) * Number(interval))}, além do tempo das chamadas e da fila.`}
          </div>
          <p className="text-muted">
            Só respostas 2xx concluem a entrega. Redirects não são seguidos. Não
            há garantia de ordem nem entrega exatamente uma vez.
          </p>
        </div>
        <div className="form-actions">
          <Button variant="secondary" asChild>
            <Link to={`/namespaces/${namespaceId}`}>Voltar</Link>
          </Button>
          <Button type="submit" disabled={save.isPending || locked}>
            {save.isPending
              ? "Salvando…"
              : destination
                ? "Salvar alterações"
                : "Criar destino"}
          </Button>
        </div>
      </form>
      {destination && !locked ? (
        <div className="page-bottom-actions">
          <p>
            Arquivamento é diferente de pausa: cancela pendências e encerra
            novas inscrições.
          </p>
          <Button
            variant="ghost"
            className="text-danger"
            onClick={() => {
              change.reset();
              setConfirm("archive");
            }}
          >
            <Archive size={16} aria-hidden="true" />
            Arquivar destino
          </Button>
        </div>
      ) : null}
      <Confirm
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title={
          confirm === "archive"
            ? "Arquivar este destino?"
            : "Pausar este destino?"
        }
        description={
          confirm === "archive"
            ? "Não receberá eventos futuros. Entregas em espera serão canceladas; tentativas em andamento podem terminar. Histórico preservado. Esta ação não pode ser desfeita pelo painel."
            : "Novas entregas continuam entrando na fila, sem iniciar tentativas. Chamadas já em andamento podem terminar. Retomar preserva os contadores."
        }
        action={confirm === "archive" ? "Arquivar destino" : "Pausar entregas"}
        pending={change.isPending}
        error={<ErrorNotice error={change.error} />}
        onConfirm={() => {
          void change
            .mutateAsync(confirm === "archive" ? "archived" : "paused")
            .then(() => setConfirm(null))
            .catch(() => {});
        }}
      />
    </>
  );
}
