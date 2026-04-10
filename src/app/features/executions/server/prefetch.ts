
import { prefetch, trpc } from "@/trpc/server";
import type { inferInput } from "@trpc/tanstack-react-query";

type Input = inferInput<typeof trpc.executions.getMany>;

export const prefetchExecutions = (params: Input) => {
    return prefetch(trpc.executions.getMany.queryOptions(params));
}

export const prefetchExecution = (id: string) => {
    return prefetch(trpc.executions.getOne.queryOptions({ id }));
}

export const prefetchCurrentMonthUsage = () => {
    return prefetch(trpc.executions.getCurrentMonthUsage.queryOptions());
}

export const prefetchCurrentMonthStats = () => {
    return prefetch(trpc.executions.getCurrentMonthStats.queryOptions());
}