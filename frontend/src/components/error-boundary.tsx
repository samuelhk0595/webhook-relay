import { Component, type ReactNode } from "react";
import { Button } from "./ui/button";

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="auth-loading">
        <h1>Não foi possível abrir esta tela</h1>
        <p className="text-muted mt-4 mb-6">
          Uma atualização pode ter alterado os arquivos do painel. Recarregue a
          página. Se continuar, consulte os logs do servidor.
        </p>
        <Button onClick={() => window.location.reload()}>
          Recarregar painel
        </Button>
      </main>
    ) : (
      this.props.children
    );
  }
}
