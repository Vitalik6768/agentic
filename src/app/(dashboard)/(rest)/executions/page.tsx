import { executionsParamsLoader } from "@/app/features/executions/server/params-loader";
import { prefetchExecutions } from "@/app/features/executions/server/prefetch";
import { ExecutionsContainer, ExecutionsError, ExecutionsList, ExecutionsLoading } from "@/app/features/executions/components/executions";
import { requireAuth } from "@/server/better-auth/server";
import { HydrateClient } from "@/trpc/server";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

const page = async ({ searchParams }: { searchParams: Promise<SearchParams> }) => {
  await requireAuth();

  const params = await executionsParamsLoader(searchParams);
  prefetchExecutions(params);
  return (
      <ExecutionsContainer>
        <HydrateClient>
          <ErrorBoundary fallback={<ExecutionsError />}>
            <Suspense fallback={<ExecutionsLoading />}>
              <ExecutionsList />
            </Suspense>
          </ErrorBoundary>
        </HydrateClient>
      </ExecutionsContainer>
  )
}

export default page;