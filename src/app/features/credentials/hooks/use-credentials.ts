import { useTRPC } from "@/trpc/react";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCredentialsParams } from "./use-credentials-params";
import { type CredentialType } from "@/types";


export const useSuspenseCredentials = () => {

    const trpc = useTRPC();
    const [params] = useCredentialsParams();

    return useSuspenseQuery(trpc.credentials.getMany.queryOptions(params));

}

export const useCreateCredential = () => {
    const queryClient = useQueryClient();
    const trpc = useTRPC();

    return useMutation(trpc.credentials.create.mutationOptions({
        onSuccess: (data) => {
            toast.success(`Credential ${data.name} created successfully`);
            void queryClient.invalidateQueries(trpc.credentials.getMany.queryOptions({}));
        },
        onError: (error) => {
            toast.error(`failed to create credential ${error.message}`);
        },
    }));

}

export const useRemoveCredential = () => {
    const queryClient = useQueryClient();
    const trpc = useTRPC();

    return useMutation(trpc.credentials.remove.mutationOptions({
        onSuccess: (data) => {
            toast.success(`Credential deleted successfully`);
            void queryClient.invalidateQueries(trpc.credentials.getMany.queryOptions({}));
            void queryClient.invalidateQueries(trpc.credentials.getOne.queryFilter({ id: data.id }));
        },
        onError: (error) => {
            toast.error(`failed to delete credential ${error.message}`);
        },
    }));

}

export const useSuspenseCredential = (id: string) => {

    const trpc = useTRPC();
    return useSuspenseQuery(trpc.credentials.getOne.queryOptions({ id }));

}


export const useUpdateCredential = () => {
    const queryClient = useQueryClient();
    const trpc = useTRPC();

    return useMutation(trpc.credentials.update.mutationOptions({
        onSuccess: (data) => {
            toast.success(`Credential ${data.name} saved successfully`);
            void queryClient.invalidateQueries(trpc.credentials.getMany.queryOptions({}));
            void queryClient.invalidateQueries(trpc.credentials.getOne.queryOptions({ id: data.id }));
        },
        onError: (error) => {
            toast.error(`failed to save credential ${error.message}`);
        },
    }));

}

export const useGetCredentialsByType = (type: CredentialType) => {
    const trpc = useTRPC();
    return useQuery(trpc.credentials.getByType.queryOptions({ type }));
}