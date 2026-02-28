import { useTRPC } from "@/trpc/react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWorkflowsParams } from "./use-workflows-params";

export const useSuspenseWorkflows = () => {

    const trpc = useTRPC();
    const [params] = useWorkflowsParams();

    return useSuspenseQuery(trpc.workflows.getMany.queryOptions(params));

}


export const useSuspenseWorkflow = (id: string) => {

    const trpc = useTRPC();
    return useSuspenseQuery(trpc.workflows.getOne.queryOptions({ id }));

}

export const useCreateWorkflow = () => {
    const queryClient = useQueryClient();
    const trpc = useTRPC();

    return useMutation(trpc.workflows.create.mutationOptions({
        onSuccess: (data) => {
            toast.success(`Workflow ${data.name} created successfully`);
            void queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));
        },
        onError: (error) => {
            toast.error(`failed to create workflow ${error.message}`);
        },
    }));

}

export const useUpdateWorkflowName = () => {
    const queryClient = useQueryClient();
    const trpc = useTRPC();

    return useMutation(trpc.workflows.updateName.mutationOptions({
        onSuccess: (data) => {
            toast.success(`Workflow ${data.name} updated successfully`);
            void queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));
            // void queryClient.invalidateQueries(trpc.workflows.getOne.queryOptions({ id: data.id }));
        },
        onError: (error) => {
            toast.error(`failed to update workflow name ${error.message}`);
        },
    }));

}

export const useRemoveWorkflow = () => {
    const queryClient = useQueryClient();
    const trpc = useTRPC();

    return useMutation(trpc.workflows.remove.mutationOptions({
        onSuccess: (data) => {
            toast.success(`Workflow deleted successfully`);
            void queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));
            void queryClient.invalidateQueries(trpc.workflows.getOne.queryFilter({ id: data.id }));
        },
        onError: (error) => {
            toast.error(`failed to delete workflow ${error.message}`);
        },
    }));

}

export const useUpdateWorkflow = () => {
    const queryClient = useQueryClient();
    const trpc = useTRPC();

    return useMutation(trpc.workflows.update.mutationOptions({
        onSuccess: (data) => {
            toast.success(`Workflow ${data.name} saved successfully`);
            void queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));
            void queryClient.invalidateQueries(trpc.workflows.getOne.queryOptions({ id: data.id }));
        },
        onError: (error) => {
            toast.error(`failed to save workflow ${error.message}`);
        },
    }));

}

export const useExecuteWorkflow = () => {
    const trpc = useTRPC();

    return useMutation(trpc.workflows.execute.mutationOptions({
        onSuccess: (data) => {
            toast.success(`Workflow executed successfully`);
        },
        onError: (error) => {
            toast.error(`failed to execute workflow ${error.message}`);
        },
    }));

}

export const useUpdatePublishedWorkflow = () => {
    const queryClient = useQueryClient();
    const trpc = useTRPC();

    return useMutation(trpc.workflows.updataPublished.mutationOptions({
        onSuccess: (data) => {
            toast.success(`Workflow published successfully`);
            void queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));
            void queryClient.invalidateQueries(trpc.workflows.getOne.queryOptions({ id: data.id }));
        },
        onError: (error) => {
            toast.error(`failed to publish workflow ${error.message}`);
        },
    }));
}

