import { useState, type FormEvent } from "react";
import { KeyRound, Plus, ShieldAlert } from "lucide-react";
import { api } from "../lib/api";
import type { Token } from "../lib/contracts";
import { useAction, usePages } from "../lib/queries";
import { date } from "../lib/utils";
import {
  CopyButton,
  Empty,
  ErrorNotice,
  Field,
  Heading,
  Loading,
  More,
} from "../components/common";
import { Button } from "../components/ui/button";
import { Confirm, Dialog } from "../components/ui/dialog";

export default function Tokens() {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("30");
  const [revoke, setRevoke] = useState<Token | null>(null);
  const [saved, setSaved] = useState(false);
  const list = usePages(["tokens", "list"], (cursor, signal) =>
    api.tokens({ cursor, limit: 20 }, signal),
  );
  const create = useAction(
    () =>
      api.createToken({
        name,
        expires_at:
          expiry === "never"
            ? null
            : new Date(Date.now() + Number(expiry) * 86400000).toISOString(),
      }),
    "",
  );
  const remove = useAction(
    () => api.revokeToken(revoke!.id),
    "Token revogado. Novas requisições com ele serão rejeitadas.",
  );
  const rows = list.data?.pages.flatMap((page) => page.items) ?? [];
  function close(value: boolean) {
    if (create.isPending || (create.data && !saved)) return;
    setCreating(value);
    if (!value) {
      create.reset();
      setName("");
      setSaved(false);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await create.mutateAsync(undefined);
    } catch {
      /* Inline error. */
    }
  }
  return (
    <>
      <Heading
        title="Tokens de API"
        description="Acesso administrativo para scripts e agentes, sem usar sua senha."
        actions={
          <Button
            onClick={() => {
              create.reset();
              setSaved(false);
              setCreating(true);
            }}
          >
            <Plus size={17} aria-hidden="true" />
            Criar token
          </Button>
        }
      />
      <div className="notice notice-info">
        <ShieldAlert size={19} aria-hidden="true" />
        <p>
          Todos os tokens têm acesso administrativo completo. Armazene em um
          gerenciador de segredos e revogue os que não usa mais. O valor
          completo aparece uma única vez.
        </p>
      </div>
      <ErrorNotice
        error={list.error}
        retry={() => {
          void list.refetch();
        }}
      />
      <section className="panel">
        {list.isPending ? (
          <Loading />
        ) : list.data ? (
          rows.length ? (
            <>
              <div className="table-scroll">
                <table>
                  <caption className="sr-only">Tokens administrativos</caption>
                  <thead>
                    <tr>
                      <th>Nome / prefixo</th>
                      <th>Criado em</th>
                      <th>Último uso</th>
                      <th>Expira em</th>
                      <th>Estado</th>
                      <th>
                        <span className="sr-only">Ação</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((token) => {
                      const expired =
                        token.expires_at !== null &&
                        new Date(token.expires_at).getTime() <=
                          list.dataUpdatedAt;
                      return (
                        <tr key={token.id}>
                          <td>
                            <strong>{token.name}</strong>
                            <small className="mono">{token.prefix}…</small>
                          </td>
                          <td>{date(token.created_at)}</td>
                          <td>
                            {token.last_used_at
                              ? date(token.last_used_at)
                              : "Nunca utilizado"}
                          </td>
                          <td>
                            {token.expires_at
                              ? date(token.expires_at)
                              : "Sem expiração"}
                          </td>
                          <td>
                            <span
                              className={`status status-${token.revoked_at ? "cancelled" : expired ? "failed" : "active"}`}
                            >
                              <span aria-hidden="true" />
                              {token.revoked_at
                                ? "Revogado"
                                : expired
                                  ? "Expirado"
                                  : "Ativo"}
                            </span>
                          </td>
                          <td>
                            {!token.revoked_at && !expired ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-danger"
                                onClick={() => {
                                  remove.reset();
                                  setRevoke(token);
                                }}
                              >
                                Revogar
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <More
                hasNext={list.hasNextPage}
                pending={list.isFetchingNextPage}
                load={() => {
                  void list.fetchNextPage();
                }}
              />
            </>
          ) : (
            <Empty
              title="Nenhum token criado"
              description="O painel usa sua sessão. Crie um token apenas quando um script ou agente precisar acessar a API."
            >
              <Button variant="secondary" onClick={() => setCreating(true)}>
                <KeyRound size={16} aria-hidden="true" />
                Criar primeiro token
              </Button>
            </Empty>
          )
        ) : null}
      </section>
      <section className="panel api-example">
        <h2>Usar em uma requisição</h2>
        <p>
          Defina <code>WEBHOOK_TOKEN</code> no ambiente do seu script. Nunca o
          inclua em URLs ou logs.
        </p>
        <pre>
          <code>
            {
              'curl --fail-with-body \\\n  -H "Authorization: Bearer $WEBHOOK_TOKEN" \\\n  "https://seu-dominio/api/v1/namespaces"'
            }
          </code>
        </pre>
        <a
          className="text-link"
          href="/api/v1/openapi.json"
          target="_blank"
          rel="noreferrer"
        >
          Abrir contrato OpenAPI protegido
        </a>
      </section>
      <Dialog
        open={creating}
        dismissible={!create.isPending && (!create.data || saved)}
        onOpenChange={close}
        title={create.data ? "Guarde seu token agora" : "Criar token de API"}
        description={
          create.data
            ? "Esta é a única exibição do valor completo. Ele não poderá ser recuperado depois de fechar."
            : "Escolha um nome que identifique o script ou agente. O token terá acesso administrativo completo."
        }
      >
        {create.data ? (
          <div className="token-secret">
            <code>{create.data.secret}</code>
            <CopyButton value={create.data.secret} label="Copiar token" />
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={saved}
                onChange={(e) => setSaved(e.target.checked)}
              />
              Guardei o token em um local seguro
            </label>
            <Button
              className="w-full"
              disabled={!saved}
              onClick={() => close(false)}
            >
              Concluir
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              void submit(event);
            }}
            className="dialog-form"
          >
            <ErrorNotice error={create.error} />
            <Field label="Nome do token">
              {(props) => (
                <input
                  {...props}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={120}
                  placeholder="Ex.: Agente local"
                />
              )}
            </Field>
            <Field label="Validade">
              {(props) => (
                <select
                  {...props}
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                >
                  <option value="7">7 dias</option>
                  <option value="30">30 dias</option>
                  <option value="90">90 dias</option>
                  <option value="never">Sem expiração</option>
                </select>
              )}
            </Field>
            <div className="dialog-actions">
              <Button
                variant="secondary"
                disabled={create.isPending}
                onClick={() => close(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Criando…" : "Criar token"}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
      <Confirm
        open={Boolean(revoke)}
        onOpenChange={(value) => {
          if (!value) setRevoke(null);
        }}
        title="Revogar este token?"
        description={`O token “${revoke?.name ?? ""}” deixará de autenticar scripts e agentes. Essa ação não pode ser desfeita.`}
        action="Revogar token"
        pending={remove.isPending}
        error={<ErrorNotice error={remove.error} />}
        onConfirm={() => {
          void remove
            .mutateAsync(undefined)
            .then(() => setRevoke(null))
            .catch(() => {});
        }}
      />
    </>
  );
}
