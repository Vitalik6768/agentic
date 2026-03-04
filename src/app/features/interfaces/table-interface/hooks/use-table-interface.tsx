import { useTRPC } from "@/trpc/react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export type TableDataJson = {
  version: 1;
  rows: Array<{
    id: string;
    cells: string[];
  }>;
  bindings?: Record<
    string,
    {
      workflowId: string;
      path: string;
      mode: "latestOutput";
    }
  >;
};

export const useSuspenseTableInterface = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.tableInterface.getOne.queryOptions({ id }));
};

export const useSaveTableInterface = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.tableInterface.save.mutationOptions({
      onSuccess: (data) => {
        toast.success("Table saved successfully");
        void queryClient.invalidateQueries(trpc.tableInterface.getOne.queryOptions({ id: data.id }));
        void queryClient.invalidateQueries(trpc.interfaces.getMany.queryOptions());
      },
      onError: (error) => {
        toast.error(`Failed to save table: ${error.message}`);
      },
    }),
  );
};
