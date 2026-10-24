import { useId, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Copy,
  Inbox,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ApiError } from "../lib/api";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

export function Heading({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="heading-actions">{actions}</div> : null}
    </div>
  );
}
export function ErrorNotice({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  if (!error) return null;
  return (
    <div className="notice notice-error" role="alert">
      <AlertCircle size={18} aria-hidden="true" />
      <div>
        <strong>
          {error instanceof Error
            ? error.message
            : "Algo não saiu como esperado."}
        </strong>
        {error instanceof ApiError && error.problem.fields ? (
          <ul>
            {Object.entries(error.problem.fields).map(([field, text]) => (
              <li key={field}>{text}</li>
            ))}
          </ul>
        ) : null}
        {error instanceof ApiError && error.problem.request_id ? (
          <small>Referência: {error.problem.request_id}</small>
        ) : null}
      </div>
      {retry ? (
        <Button variant="secondary" size="sm" onClick={retry}>
          <RefreshCw size={14} aria-hidden="true" />
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={28} strokeWidth={1.5} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Loading({ label = "Carregando dados…" }: { label?: string }) {
  return (
    <div className="loading-block" role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="skeleton w-1/3 h-5" />
      <div className="skeleton h-12" />
      <div className="skeleton h-12" />
      <div className="skeleton h-12" />
    </div>
  );
}
const statusNames: Record<string, string> = {
  active: "Ativo",
  paused: "Pausado",
  archived: "Arquivado",
  pending: "Primeira tentativa",
  in_flight: "Em processamento",
  retry_scheduled: "Retry agendado",
  succeeded: "Concluída",
  failed: "Falha definitiva",
  cancelled: "Cancelada",
  interrupted: "Resultado desconhecido",
};
export function Status({ value, label }: { value: string; label?: string }) {
  return (
    <span className={cn("status", `status-${value}`)}>
      <span aria-hidden="true" />
      {label ?? statusNames[value] ?? value}
    </span>
  );
}
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: true;
  }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("field", className)}>
      <label htmlFor={id}>{label}</label>
      {children({
        id,
        "aria-describedby": hint || error ? `${id}-help` : undefined,
        "aria-invalid": error ? true : undefined,
      })}
      {hint || error ? (
        <small id={`${id}-help`} className={error ? "text-danger" : ""}>
          {error ?? hint}
        </small>
      ) : null}
    </div>
  );
}
export function CopyButton({
  value,
  label = "Copiar",
  iconOnly = false,
}: {
  value: string;
  label?: string;
  iconOnly?: boolean;
}) {
  return (
    <Button
      variant="secondary"
      size={iconOnly ? "icon" : "sm"}
      aria-label={label}
      onClick={() => {
        void navigator.clipboard.writeText(value).then(
          () => toast.success("Copiado para a área de transferência."),
          () =>
            toast.error(
              "Não foi possível copiar. Selecione e copie o texto manualmente.",
            ),
        );
      }}
    >
      <Copy size={15} aria-hidden="true" />
      {!iconOnly ? label : null}
    </Button>
  );
}
export function More({
  hasNext,
  pending,
  load,
}: {
  hasNext: boolean;
  pending: boolean;
  load: () => void;
}) {
  return hasNext ? (
    <div className="load-more">
      <Button variant="secondary" disabled={pending} onClick={load}>
        {pending ? "Carregando…" : "Carregar mais"}
      </Button>
    </div>
  ) : null;
}
export function Back({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link className="back-link" to={to}>
      <ArrowRight size={14} className="rotate-180" aria-hidden="true" />
      {children}
    </Link>
  );
}
export function SavedNote() {
  return (
    <span className="inline-flex items-center gap-2 text-muted">
      <Check size={14} aria-hidden="true" />
      Alterações salvas
    </span>
  );
}
