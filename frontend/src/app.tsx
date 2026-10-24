import { Suspense, lazy, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Protected } from "./lib/auth";
import { Layout } from "./components/layout";
import { Loading } from "./components/common";

const Login = lazy(() => import("./pages/login"));
const Dashboard = lazy(() => import("./pages/dashboard"));
const Namespaces = lazy(() =>
  import("./pages/namespaces").then((module) => ({
    default: module.Namespaces,
  })),
);
const NamespaceDetail = lazy(() =>
  import("./pages/namespaces").then((module) => ({
    default: module.NamespaceDetail,
  })),
);
const NamespaceEditor = lazy(() =>
  import("./pages/namespaces").then((module) => ({
    default: module.NamespaceEditor,
  })),
);
const DestinationEditor = lazy(() => import("./pages/destinations"));
const Events = lazy(() =>
  import("./pages/events").then((module) => ({ default: module.Events })),
);
const EventDetail = lazy(() =>
  import("./pages/events").then((module) => ({ default: module.EventDetail })),
);
const Tokens = lazy(() => import("./pages/tokens"));
const NotFound = lazy(() => import("./pages/not-found"));
function RouteFocus() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const timer = window.setTimeout(
      () => document.getElementById("main")?.focus({ preventScroll: true }),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [pathname]);
  return null;
}
export default function App() {
  return (
    <>
      <RouteFocus />
      <Suspense
        fallback={
          <div className="route-loading">
            <Loading label="Carregando página…" />
          </div>
        }
      >
        <Routes>
          <Route path="login" element={<Login />} />
          <Route
            element={
              <Protected>
                <Layout />
              </Protected>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="namespaces" element={<Namespaces />} />
            <Route path="namespaces/new" element={<NamespaceEditor />} />
            <Route path="namespaces/:id" element={<NamespaceDetail />} />
            <Route path="namespaces/:id/edit" element={<NamespaceEditor />} />
            <Route path="destinations/new" element={<DestinationEditor />} />
            <Route path="destinations/:id" element={<DestinationEditor />} />
            <Route path="events" element={<Events />} />
            <Route path="events/:id" element={<EventDetail />} />
            <Route path="tokens" element={<Tokens />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
