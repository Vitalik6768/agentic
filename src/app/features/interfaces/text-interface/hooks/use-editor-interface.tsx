import { useTRPC } from "@/trpc/react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export const useSuspenseTextInterface = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.textInterface.getOne.queryOptions({ id }));
};

export const useSaveTextInterface = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.textInterface.save.mutationOptions({
      onSuccess: (data) => {
        toast.success("Content saved successfully");
        void queryClient.invalidateQueries(trpc.textInterface.getOne.queryOptions({ id: data.id }));
        void queryClient.invalidateQueries(trpc.interfaces.getMany.queryOptions());
      },
      onError: (error) => {
        toast.error(`Failed to save content: ${error.message}`);
      },
    }),
  );
};
