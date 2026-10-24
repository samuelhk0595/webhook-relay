import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...values: ClassValue[]) => twMerge(clsx(values));
const numbers = new Intl.NumberFormat("pt-BR");
export const number = (n: number) => numbers.format(n);
export const date = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
export const clock = (value: number) =>
  new Intl.DateTimeFormat("pt-BR", { timeStyle: "medium" }).format(value);
export const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
export const bytes = (n: number) =>
  n < 1024
    ? `${n} B`
    : n < 1048576
      ? `${(n / 1024).toFixed(1)} KiB`
      : `${(n / 1048576).toFixed(1)} MiB`;
export const duration = (seconds: number | null) =>
  seconds === null
    ? "Sem pendências"
    : seconds < 60
      ? `${Math.floor(seconds)} s`
      : seconds < 3600
        ? `${Math.floor(seconds / 60)} min`
        : seconds < 86400
          ? `${Math.floor(seconds / 3600)} h`
          : `${Math.floor(seconds / 86400)} ${seconds < 172800 ? "dia" : "dias"}`;
export const minuteISO = (value: number) =>
  new Date(Math.floor(value / 60000) * 60000).toISOString();
