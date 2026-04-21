import { useTRPC } from "@/trpc/react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { InterfaceType } from "generated/prisma";
import { toast } from "sonner";

export const useSuspenseInterfaces = () => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.interfaces.getMany.queryOptions());
};

export const useCreateInterface = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.interfaces.create.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Interface ${data.name} created successfully`);
        void queryClient.invalidateQueries(trpc.interfaces.getMany.queryOptions());
      },
      onError: (error) => {
        toast.error(`failed to create interface ${error.message}`);
      },
    }),
  );
};

export const useRemoveInterface = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.interfaces.remove.mutationOptions({
      onSuccess: () => {
        toast.success("Interface deleted successfully");
        void queryClient.invalidateQueries(trpc.interfaces.getMany.queryOptions());
      },
      onError: (error) => {
        toast.error(`failed to delete interface ${error.message}`);
      },
    }),
  );
};

export const INTERFACE_TYPES = [
  {
    value: InterfaceType.TEXT,
    label: "Text Interface",
    description: "Rich text editor interface",
  },
  {
    value: InterfaceType.TABLE,
    label: "Table Interface",
    description: "Spreadsheet-like rows and columns",
  },
  {
    value: InterfaceType.CHAT,
    label: "Chat Interface",
    description: "Chat UI connected to a workflow trigger",
  },
] as const;
