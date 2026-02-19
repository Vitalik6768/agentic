import { useTRPC } from "@/trpc/react";
import { useSuspenseQuery } from "@tanstack/react-query";

export const useSuspenseWorkflows = () => {
  const trpc = useTRPC();
//   return useSuspenseQuery(
//     trpc.workflows.getMany.queryOptions(),
//   );
};
