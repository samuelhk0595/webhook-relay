import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type { Page, Params } from "./contracts";
import { minuteISO } from "./utils";

async function allPages<T>(
  fn: (cursor?: string) => Promise<Page<T>>,
): Promise<T[]> {
  const result: T[] = [];
  let cursor: string | undefined;
  const seen = new Set<string>();
  do {
    const page = await fn(cursor);
    result.push(...page.items);
    cursor = page.next_cursor ?? undefined;
    if (cursor && seen.has(cursor))
      throw new Error("A API repetiu o cursor de paginação.");
    if (cursor) seen.add(cursor);
  } while (cursor);
  return result;
}
export function useChoices() {
  const namespaces = useQuery({
    queryKey: ["namespaces", "choices"],
    queryFn: ({ signal }) =>
      allPages((cursor) => api.namespaces({ limit: 100, cursor }, signal)),
    staleTime: 30000,
  });
  const destinations = useQuery({
    queryKey: ["destinations", "choices"],
    queryFn: ({ signal }) =>
      allPages((cursor) => api.destinations({ limit: 100, cursor }, signal)),
    staleTime: 30000,
  });
  return { namespaces, destinations };
}
export function useFilters() {
  const [search, setSearch] = useSearchParams();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setNow(Date.now());
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);
  const range = ["24h", "7d", "30d", "custom"].includes(
    search.get("range") ?? "",
  )
    ? search.get("range")!
    : "24h";
  const ns = search.get("namespace_id") ?? "";
  const dst = search.get("destination_id") ?? "";
  const fromInput = search.get("from") ?? "";
  const toInput = search.get("to") ?? "";
  const fromMs =
    range === "custom"
      ? new Date(fromInput).getTime()
      : now -
        ({ "24h": 86400000, "7d": 604800000, "30d": 2592000000 }[range] ??
          86400000);
  const toMs = range === "custom" ? new Date(toInput).getTime() : now;
  const valid =
    Number.isFinite(fromMs) &&
    Number.isFinite(toMs) &&
    Math.floor(fromMs / 60000) < Math.floor(toMs / 60000);
  const params: Params = {
    namespace_id: ns || undefined,
    destination_id: dst || undefined,
    ...(valid ? { from: minuteISO(fromMs), to: minuteISO(toMs) } : {}),
  };
  function change(key: string, value: string) {
    setSearch((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key === "namespace_id") next.delete("destination_id");
      next.delete("cursor");
      return next;
    });
  }
  return {
    range,
    ns,
    dst,
    fromInput,
    toInput,
    valid,
    params,
    change,
    state: search.get("state") ?? "",
  };
}
export type FiltersValue = ReturnType<typeof useFilters>;
