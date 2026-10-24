import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router-dom";
import { api, ApiError, setCsrf } from "./api";
import type { Session } from "./contracts";
import { ErrorNotice, Loading } from "../components/common";

const SessionContext = createContext<Session | null>(null);
// eslint-disable-next-line react-refresh/only-export-components
export function useSession() {
  return useContext(SessionContext);
}
export function Protected({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const location = useLocation();
  const session = useQuery({
    queryKey: ["session"],
    queryFn: async ({ signal }) => {
      const value = await api.me(signal);
      setCsrf(value.csrf_token);
      return value;
    },
    staleTime: 60000,
    retry: false,
  });
  useEffect(() => {
    const expired = () => {
      setCsrf(null);
      client.clear();
      void client.invalidateQueries({ queryKey: ["session"] });
    };
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, [client]);
  if (session.isPending)
    return (
      <div className="auth-loading">
        <Loading label="Verificando sessão…" />
      </div>
    );
  if (session.error instanceof ApiError && session.error.status === 401)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  if (session.isError)
    return (
      <div className="auth-loading">
        <h1>Conexão indisponível</h1>
        <ErrorNotice
          error={session.error}
          retry={() => {
            void session.refetch();
          }}
        />
      </div>
    );
  return (
    <SessionContext.Provider value={session.data ?? null}>
      {children}
    </SessionContext.Provider>
  );
}
