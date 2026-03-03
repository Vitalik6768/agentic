import { prefetch, trpc } from "@/trpc/server";

export const prefetchTextInterface = (id: string) => {
  return prefetch(trpc.textInterface.getOne.queryOptions({ id }));
};
