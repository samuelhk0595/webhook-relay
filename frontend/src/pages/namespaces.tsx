import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Archive, Boxes, Plus, ShieldCheck } from "lucide-react";
import { api, ApiError } from "../lib/api";
import type { Namespace, NamespaceInput } from "../lib/contracts";
import { polling, useAction, usePages } from "../lib/queries";
import { date } from "../lib/utils";
import {
  Back,
  CopyButton,
  Empty,
  ErrorNotice,
  Field,
  Heading,
  Loading,
  More,
  Status,
} from "../components/common";
import { Button } from "../components/ui/button";
import { Confirm } from "../components/ui/dialog";

export function Namespaces() {
  const [archived, setArchived] = useState(false);
  const result = usePages(["namespaces", "list", archived], (cursor, signal) =>
    api.namespaces(
      { status: archived ? undefined : "active", cursor, limit: 20 },
      signal,
    ),
  );
  const rows = result.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <>
      <Heading
        title="Namespaces"
        description="Uma URL de entrada. Quantos destinos você precisar."
        actions={
          <Button asChild>
            <Link to="/namespaces/new">
              <Plus size={17} aria-hidden="true" />
              Novo namespace
            </Link>
          </Button>
        }
      />
      <div className="list-toolbar">
        <p>O namespace precisa existir antes do primeiro webhook.</p>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />
          Incluir arquivados
        </label>
      </div>
      <ErrorNotice
        error={result.error}
        retry={() => {
          void result.refetch();
        }}
      />
      {result.isPending ? (
        <Loading />
      ) : result.data ? (
        rows.length ? (
          <div className="namespace-list">
            {rows.map((namespace) => (
              <article className="namespace-row" key={namespace.id}>
                <div className="namespace-icon">
                  <Boxes size={22} aria-hidden="true" />
                </div>
                <div className="namespace-main">
                  <div className="namespace-name">
                    <Link
                      className="row-link"
                      to={`/namespaces/${namespace.id}`}
                    >
                      {namespace.name}
                    </Link>
                    <Status value={namespace.status} />
                  </div>
                  <div className="url-line">
                    <code>{namespace.ingress_url}</code>
                    <CopyButton
                      value={namespace.ingress_url}
                      label={`Copiar URL de ${namespace.name}`}
                      iconOnly
                    />
                  </div>
                  <small>
                    {namespace.destination_count}{" "}
                    {namespace.destination_count === 1 ? "destino" : "destinos"}{" "}
                    ·{" "}
                    {namespace.has_ingress_secret
                      ? "Segredo de entrada configurado"
                      : "Sem segredo de entrada"}
                  </small>
                </div>
                <Button variant="secondary" size="sm" asChild>
                  <Link to={`/namespaces/${namespace.id}`}>
                    Gerenciar
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                </Button>
              </article>
            ))}
            <More
              hasNext={result.hasNextPage}
              pending={result.isFetchingNextPage}
              load={() => {
                void result.fetchNextPage();
              }}
            />
          </div>
        ) : (
          <div className="panel">
            <Empty
              title="Crie sua primeira entrada"
              description="Escolha um nome e um slug. Depois, conecte os destinos que devem receber seus webhooks."
            >
              <Button asChild>
                <Link to="/namespaces/new">
                  <Plus size={16} aria-hidden="true" />
                  Criar namespace
                </Link>
              </Button>
            </Empty>
          </div>
        )
      ) : null}
      <div className="notice notice-info">
        <ShieldCheck size={19} aria-hidden="true" />
        <p>
          Eventos sem destinos também são guardados. Um destino adicionado
          depois só recebe o histórico se você fizer um reenvio manual.
        </p>
      </div>
    </>
  );
}
export function NamespaceDetail() {
  const { id = "" } = useParams();
  const [confirm, setConfirm] = useState(false);
  const namespace = useQuery({
    queryKey: ["namespaces", id],
    queryFn: ({ signal }) => api.namespace(id, signal),
    ...polling,
  });
  const destinations = usePages(
    ["destinations", "namespace", id],
    (cursor, signal) =>
      api.destinations({ namespace_id: id, cursor, limit: 20 }, signal),
  );
  const action = useAction(
    () => api.updateNamespace(id, { status: "archived" }),
    "Namespace arquivado. O histórico e as entregas existentes foram preservados.",
  );
  const data = namespace.data;
  const rows = destinations.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <>
      <Back to="/namespaces">Namespaces</Back>
      <Heading
        title={data?.name ?? "Namespace"}
        description="Configure a entrada e acompanhe os destinos inscritos."
        actions={
          data?.status === "active" ? (
            <Button variant="secondary" asChild>
              <Link to={`/namespaces/${id}/edit`}>Editar namespace</Link>
            </Button>
          ) : null
        }
      />
      <ErrorNotice
        error={namespace.error}
        retry={() => {
          void namespace.refetch();
        }}
      />
      {namespace.isPending ? <Loading /> : null}
      {data ? (
        <>
          <section className="panel ingress-panel">
            <div>
              <Status value={data.status} />
              <h2>URL de entrada</h2>
              <div className="url-line">
                <code>{data.ingress_url}</code>
                <CopyButton value={data.ingress_url} label="Copiar URL" />
              </div>
              <p>
                Slug <code>{data.slug}</code> · criado em{" "}
                {date(data.created_at)}
              </p>
            </div>
            <div className="ingress-security">
              <ShieldCheck size={19} aria-hidden="true" />
              <span>
                {data.has_ingress_secret
                  ? "Protegido por segredo de entrada"
                  : "Entrada sem segredo adicional"}
                <small>
                  {data.has_ingress_secret
                    ? "Header: X-Webhook-Secret. Removido antes do encaminhamento."
                    : "Assinaturas do provedor são preservadas no encaminhamento."}
                </small>
              </span>
            </div>
          </section>
          {data.status === "archived" ? (
            <div className="notice notice-info">
              Este namespace não aceita novas entradas. Entregas já existentes
              podem concluir normalmente.
            </div>
          ) : null}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Destinos</h2>
                <p>Política e tentativas independentes para cada assinatura.</p>
              </div>
              {data.status === "active" ? (
                <Button size="sm" asChild>
                  <Link to={`/destinations/new?namespace_id=${id}`}>
                    <Plus size={16} aria-hidden="true" />
                    Adicionar destino
                  </Link>
                </Button>
              ) : null}
            </div>
            <ErrorNotice
              error={destinations.error}
              retry={() => {
                void destinations.refetch();
              }}
            />
            {destinations.isPending ? (
              <Loading />
            ) : destinations.data ? (
              rows.length ? (
                <>
                  <div className="table-scroll">
                    <table>
                      <caption className="sr-only">
                        Destinos inscritos no namespace
                      </caption>
                      <thead>
                        <tr>
                          <th>Nome / URL</th>
                          <th>Estado</th>
                          <th>Retries</th>
                          <th>Intervalo / timeout</th>
                          <th>
                            <span className="sr-only">Ação</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((destination) => (
                          <tr key={destination.id}>
                            <td>
                              <Link
                                className="row-link"
                                to={`/destinations/${destination.id}`}
                              >
                                {destination.name}
                              </Link>
                              <small className="break-url">
                                {destination.url}
                              </small>
                            </td>
                            <td>
                              <Status value={destination.status} />
                            </td>
                            <td>
                              {destination.max_retries === null
                                ? "Ilimitados"
                                : destination.max_retries}
                            </td>
                            <td>
                              {destination.retry_interval_seconds} s /{" "}
                              {destination.timeout_seconds} s
                            </td>
                            <td>
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/destinations/${destination.id}`}>
                                  Configurar
                                  <ArrowUpRight size={14} aria-hidden="true" />
                                </Link>
                              </Button>
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
                  title="A entrada está pronta. Falta o destino."
                  description="Adicione uma URL alcançável pela VPS. Novos eventos serão inscritos automaticamente nos destinos não arquivados."
                />
              )
            ) : null}
          </section>
          <div className="page-bottom-actions">
            <Link className="text-link" to={`/events?namespace_id=${id}`}>
              Consultar eventos deste namespace
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
            {data.status === "active" ? (
              <Button
                variant="ghost"
                className="text-danger"
                onClick={() => {
                  action.reset();
                  setConfirm(true);
                }}
              >
                <Archive size={16} aria-hidden="true" />
                Arquivar namespace
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
      <Confirm
        open={confirm}
        onOpenChange={setConfirm}
        title="Arquivar este namespace?"
        description="Novas entradas serão rejeitadas. O histórico permanece disponível e as entregas existentes continuam. Esta ação não pode ser desfeita pelo painel."
        action="Arquivar namespace"
        pending={action.isPending}
        error={<ErrorNotice error={action.error} />}
        onConfirm={() => {
          void action
            .mutateAsync(undefined)
            .then(() => setConfirm(false))
            .catch(() => {});
        }}
      />
    </>
  );
}
export function NamespaceEditor() {
  const { id } = useParams();
  const result = useQuery({
    queryKey: ["namespaces", id],
    queryFn: ({ signal }) => api.namespace(id!, signal),
    enabled: Boolean(id),
  });
  return (
    <>
      <Back to={id ? `/namespaces/${id}` : "/namespaces"}>
        {id ? "Voltar ao namespace" : "Namespaces"}
      </Back>
      <Heading
        title={id ? "Editar namespace" : "Novo namespace"}
        description="Defina a entrada que agrupa seus destinos de webhook."
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
        <NamespaceForm key={result.data?.id ?? "new"} namespace={result.data} />
      ) : null}
    </>
  );
}
function NamespaceForm({ namespace }: { namespace?: Namespace }) {
  const [name, setName] = useState(namespace?.name ?? "");
  const [slug, setSlug] = useState(namespace?.slug ?? "");
  const [secret, setSecret] = useState("");
  const [remove, setRemove] = useState(false);
  const navigate = useNavigate();
  const action = useAction(
    (body: NamespaceInput) =>
      namespace
        ? api.updateNamespace(namespace.id, body)
        : api.createNamespace(body),
    namespace
      ? "Namespace atualizado."
      : "Namespace criado. Agora você pode adicionar destinos.",
  );
  const fields =
    action.error instanceof ApiError ? action.error.problem.fields : undefined;
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const result = await action.mutateAsync({
        name,
        ...(!namespace ? { slug } : {}),
        ...(remove
          ? { ingress_secret: null }
          : secret
            ? { ingress_secret: secret }
            : {}),
      });
      setSecret("");
      navigate(`/namespaces/${result.id}`);
    } catch {
      /* Keep values on failure. */
    }
  }
  return (
    <form
      className="form-panel"
      onSubmit={(event) => {
        void submit(event);
      }}
    >
      <ErrorNotice error={action.error} />
      <div className="form-section">
        <h2>Identificação</h2>
        <Field
          label="Nome de exibição"
          hint="Um nome fácil de reconhecer no painel."
          error={fields?.name}
        >
          {(props) => (
            <input
              {...props}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
              placeholder="Ex.: Automações pessoais"
              disabled={namespace?.status === "archived"}
            />
          )}
        </Field>
        <Field
          label="Slug da URL"
          hint="De 1 a 64 caracteres: letras minúsculas, números e hífens. Não poderá ser alterado."
          error={fields?.slug}
        >
          {(props) => (
            <input
              {...props}
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              pattern="[a-z0-9-]{1,64}"
              required
              maxLength={64}
              placeholder="automacoes"
              disabled={Boolean(namespace)}
            />
          )}
        </Field>
        <p className="input-preview">
          Entrada: <code>/{slug || "seu-namespace"}</code>
        </p>
      </div>
      <div className="form-section">
        <h2>
          Segredo de entrada <span className="optional">opcional</span>
        </h2>
        <p>
          Para provedores compatíveis, envie o segredo no header{" "}
          <code>X-Webhook-Secret</code>. Ele será removido antes do
          encaminhamento.
        </p>
        <Field
          label={
            namespace?.has_ingress_secret
              ? "Novo segredo (rotacionar)"
              : "Segredo"
          }
          hint={
            namespace?.has_ingress_secret
              ? "Deixe em branco para manter o segredo atual. A rotação exige atualizar o provedor."
              : "Use ao menos 16 caracteres. O valor não será exibido novamente."
          }
          error={fields?.ingress_secret}
        >
          {(props) => (
            <input
              {...props}
              type="password"
              autoComplete="new-password"
              minLength={16}
              maxLength={256}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              disabled={remove || namespace?.status === "archived"}
            />
          )}
        </Field>
        {namespace?.has_ingress_secret ? (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={remove}
              onChange={(e) => setRemove(e.target.checked)}
            />
            Remover proteção por segredo
          </label>
        ) : null}
      </div>
      <div className="form-actions">
        <Button variant="secondary" asChild>
          <Link to={namespace ? `/namespaces/${namespace.id}` : "/namespaces"}>
            Cancelar
          </Link>
        </Button>
        <Button
          type="submit"
          disabled={action.isPending || namespace?.status === "archived"}
        >
          {action.isPending
            ? "Salvando…"
            : namespace
              ? "Salvar alterações"
              : "Criar namespace"}
        </Button>
      </div>
    </form>
  );
}
