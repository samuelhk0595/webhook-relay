import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Webhook } from "lucide-react";
import { api, setCsrf } from "../lib/api";
import { useAction } from "../lib/queries";
import { ErrorNotice, Field } from "../components/common";
import { Button } from "../components/ui/button";

export default function Login() {
  const [show, setShow] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const client = useQueryClient();
  const action = useAction(() => api.login(username, password), "");
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const session = await action.mutateAsync(undefined);
      setCsrf(session.csrf_token);
      client.clear();
      client.setQueryData(["session"], session);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(
        from?.startsWith("/") &&
          !from.startsWith("//") &&
          !from.startsWith("/login")
          ? from
          : "/",
        { replace: true },
      );
    } catch {
      /* Inline error retains the form. */
    }
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <div className="brand">
          <Webhook size={32} aria-hidden="true" />
          <span>
            Webhook<span>Forwarder</span>
          </span>
        </div>
        <div className="login-message">
          <h1>
            Seu computador pode parar.
            <br />A fila, não.
          </h1>
          <p>
            Receba na VPS. Encaminhe quando o destino estiver disponível.
            Acompanhe cada tentativa pelo mesmo lugar.
          </p>
          <div className="relay-flow">
            <span>Webhook</span>
            <ArrowRight size={18} aria-hidden="true" />
            <strong>Fila persistente</strong>
            <ArrowRight size={18} aria-hidden="true" />
            <span>Destinos</span>
          </div>
        </div>
        <p className="login-footnote">
          Ferramenta pessoal · acesso administrativo restrito
        </p>
      </section>
      <section className="login-form-region">
        <form
          className="login-form"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          <div className="login-lock">
            <LockKeyhole size={24} aria-hidden="true" />
          </div>
          <h2>Entrar no console</h2>
          <p>Use a conta de administrador configurada na VPS.</p>
          <ErrorNotice error={action.error} />
          <Field label="Usuário">
            {(props) => (
              <input
                {...props}
                autoComplete="username"
                name="username"
                required
                maxLength={128}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoFocus
              />
            )}
          </Field>
          <Field label="Senha">
            {(props) => (
              <div className="password-input">
                <input
                  {...props}
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  name="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={show}
                  onClick={() => setShow(!show)}
                >
                  {show ? (
                    <EyeOff size={18} aria-hidden="true" />
                  ) : (
                    <Eye size={18} aria-hidden="true" />
                  )}
                </Button>
              </div>
            )}
          </Field>
          <Button type="submit" disabled={action.isPending}>
            {action.isPending ? "Entrando…" : "Entrar"}
            <ArrowRight size={17} aria-hidden="true" />
          </Button>
          <p className="login-help">
            Não há cadastro público. Para recuperar o acesso, use o procedimento
            de administração no servidor.
          </p>
        </form>
      </section>
    </div>
  );
}
