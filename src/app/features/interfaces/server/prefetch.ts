import { prefetch, trpc } from "@/trpc/server";

export const prefetchInterfaces = () => {
  return prefetch(trpc.interfaces.getMany.queryOptions());
};
