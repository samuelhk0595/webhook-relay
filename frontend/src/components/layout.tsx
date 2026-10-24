import { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Boxes,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Webhook,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "../lib/auth";
import { api, setCsrf } from "../lib/api";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";

const links = [
  { to: "/", label: "Visão geral", icon: LayoutDashboard, end: true },
  { to: "/namespaces", label: "Namespaces", icon: Boxes },
  { to: "/events", label: "Eventos", icon: Activity },
  { to: "/tokens", label: "Tokens de API", icon: KeyRound },
];
function Navigation({
  onNavigate,
  collapsed,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  return (
    <nav aria-label="Navegação principal">
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          title={collapsed ? label : undefined}
        >
          <Icon size={19} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
export function Layout() {
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const session = useSession();
  const client = useQueryClient();
  const navigate = useNavigate();
  async function logout() {
    setLoggingOut(true);
    try {
      await api.logout();
      setCsrf(null);
      client.clear();
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível sair.",
      );
    } finally {
      setLoggingOut(false);
    }
  }
  return (
    <div className={`app ${collapsed ? "rail-collapsed" : ""}`}>
      <a className="skip-link" href="#main">
        Pular para conteúdo
      </a>
      <aside className="sidebar">
        <NavLink
          to="/"
          className="brand"
          aria-label="Webhook Forwarder, início"
        >
          <Webhook size={28} aria-hidden="true" />
          <span>
            Webhook<span>Forwarder</span>
          </span>
        </NavLink>
        <Navigation collapsed={collapsed} />
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="dot" />
            Operação pessoal<span>Uma entrada. Múltiplos destinos.</span>
          </div>
          <a
            className="sidebar-api"
            href="/api/v1/openapi.json"
            target="_blank"
            rel="noreferrer"
          >
            <ArrowUpRight size={17} aria-hidden="true" />
            <span>Contrato OpenAPI</span>
          </a>
          <Button
            variant="ghost"
            className="collapse-button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir navegação" : "Recolher navegação"}
          >
            {collapsed ? (
              <ChevronRight size={17} aria-hidden="true" />
            ) : (
              <>
                <ChevronLeft size={17} aria-hidden="true" />
                <span>Recolher menu</span>
              </>
            )}
          </Button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <Button
              variant="ghost"
              size="icon"
              className="mobile-menu"
              aria-label="Abrir navegação"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} aria-hidden="true" />
            </Button>
            <span>Console de administração</span>
          </div>
          <div className="topbar-right">
            <span className="account">
              <span className="avatar">
                {session?.username.slice(0, 1).toUpperCase()}
              </span>
              {session?.username}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={loggingOut}
              onClick={() => {
                void logout();
              }}
              aria-label="Sair da conta"
            >
              <LogOut size={16} aria-hidden="true" />
              <span>{loggingOut ? "Saindo…" : "Sair"}</span>
            </Button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="footer">
          <span>Webhook Forwarder</span>
          <span>Entrega assíncrona · histórico preservado</span>
        </footer>
      </div>
      <Dialog
        open={mobile}
        onOpenChange={setMobile}
        title="Webhook Forwarder"
        description="Navegue pelo console de administração."
        className="mobile-nav"
      >
        <Navigation onNavigate={() => setMobile(false)} />
      </Dialog>
    </div>
  );
}
