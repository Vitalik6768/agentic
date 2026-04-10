import { useTRPC } from "@/trpc/react";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useExecutionsParams } from "./use-executions-params";


export const useSuspenseExecutions = () => {

    const trpc = useTRPC();
    const [params] = useExecutionsParams();

    return useSuspenseQuery(trpc.executions.getMany.queryOptions(params));

}

export const useSuspenseExecution = (id: string) => {

    const trpc = useTRPC();
    return useSuspenseQuery(trpc.executions.getOne.queryOptions({ id }));

}

export const useCurrentMonthUsage = () => {
    const trpc = useTRPC();
    return useQuery(trpc.executions.getCurrentMonthUsage.queryOptions());
}

export const useCurrentMonthStats = () => {
    const trpc = useTRPC();
    return useQuery(trpc.executions.getCurrentMonthStats.queryOptions());
}