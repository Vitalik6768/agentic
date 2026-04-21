import { useTRPC } from "@/trpc/react";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export const useSuspenseChatInterface = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.chatInterface.getOne.queryOptions({ id }));
};

export const useSaveChatInterfaceSettings = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.chatInterface.saveSettings.mutationOptions({
      onSuccess: (data) => {
        toast.success("Chat interface settings saved");
        void queryClient.invalidateQueries(trpc.chatInterface.getOne.queryOptions({ id: data.id }));
        void queryClient.invalidateQueries(trpc.interfaces.getMany.queryOptions());
      },
      onError: (error) => {
        toast.error(`Failed to save settings: ${error.message}`);
      },
    }),
  );
};

export const useChatTriggerWorkflows = () => {
  const trpc = useTRPC();
  return useQuery(trpc.chatInterface.getChatTriggerWorkflows.queryOptions());
};

export const useSendChatMessage = () => {
  const trpc = useTRPC();
  return useMutation(
    trpc.chatInterface.sendMessage.mutationOptions({
      onError: (error) => {
        toast.error(`Failed to send message: ${error.message}`);
      },
    }),
  );
};

