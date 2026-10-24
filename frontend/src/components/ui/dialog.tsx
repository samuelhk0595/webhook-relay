import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as AlertPrimitive from "@radix-ui/react-alert-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className = "",
  dismissible = true,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  dismissible?: boolean;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="overlay" />
        <DialogPrimitive.Content className={`dialog ${className}`}>
          <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description>
            {description}
          </DialogPrimitive.Description>
          {dismissible ? (
            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                className="dialog-close"
                aria-label="Fechar"
              >
                <X aria-hidden="true" size={18} />
              </Button>
            </DialogPrimitive.Close>
          ) : null}
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
export function Confirm({
  open,
  onOpenChange,
  title,
  description,
  action,
  pending,
  onConfirm,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  action: string;
  pending: boolean;
  onConfirm: () => void;
  error?: ReactNode;
}) {
  return (
    <AlertPrimitive.Root
      open={open}
      onOpenChange={(value) => {
        if (!pending) onOpenChange(value);
      }}
    >
      <AlertPrimitive.Portal>
        <AlertPrimitive.Overlay className="overlay" />
        <AlertPrimitive.Content className="dialog">
          <AlertPrimitive.Title>{title}</AlertPrimitive.Title>
          <AlertPrimitive.Description>{description}</AlertPrimitive.Description>
          {error}
          <div className="dialog-actions">
            <AlertPrimitive.Cancel asChild>
              <Button variant="secondary" disabled={pending}>
                Cancelar
              </Button>
            </AlertPrimitive.Cancel>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={onConfirm}
            >
              {pending ? "Processando…" : action}
            </Button>
          </div>
        </AlertPrimitive.Content>
      </AlertPrimitive.Portal>
    </AlertPrimitive.Root>
  );
}
