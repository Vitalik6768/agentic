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