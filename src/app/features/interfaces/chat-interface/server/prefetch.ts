import { prefetch, trpc } from "@/trpc/server";

export const prefetchChatInterface = (id: string) => {
  return prefetch(trpc.chatInterface.getOne.queryOptions({ id }));
};

