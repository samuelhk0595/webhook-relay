import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { Page } from "./contracts";

export const polling = {
  refetchInterval: 10000,
  refetchIntervalInBackground: false,
} as const;
export function useAction<TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>,
  message: string,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    gcTime: 0, // Do not retain one-time secrets in the mutation cache after reset/unmount.
    onSuccess: () => {
      void client.invalidateQueries({
        predicate: (q) => q.queryKey[0] !== "session",
      });
      if (message) toast.success(message);
    },
  });
}
export function usePages<T>(
  key: QueryKey,
  fetchPage: (cursor?: string, signal?: AbortSignal) => Promise<Page<T>>,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam, signal }) => fetchPage(pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    enabled,
    ...polling,
  });
}
