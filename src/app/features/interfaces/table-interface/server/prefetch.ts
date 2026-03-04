import { prefetch, trpc } from "@/trpc/server";

export const prefetchTableInterface = (id: string) => {
  return prefetch(trpc.tableInterface.getOne.queryOptions({ id }));
};
