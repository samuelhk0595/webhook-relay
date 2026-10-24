import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import "@fontsource-variable/public-sans";
import "./styles.css";
import { ApiError } from "./lib/api";
import App from "./app";
import { ErrorBoundary } from "./components/error-boundary";

const client = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: (count, error) =>
        !(
          error instanceof ApiError &&
          error.status >= 400 &&
          error.status < 500
        ) && count < 1,
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
});
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter basename="/admin">
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{ className: "app-toast" }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
