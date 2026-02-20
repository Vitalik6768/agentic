// import { WorkflowError, WorkflowLoading, WorkflowsContainer, WorkflowsList } from "@/features/workflows/components/workflows";
import { WorkflowError, WorkflowLoading, WorkflowsContainer, WorkflowsList } from "@/app/features/workflows/components/workflows";
import { workflowsParamsLoader } from "@/app/features/workflows/server/params-loader";
// import { prefetchWorkflows } from "@/app/features/workflows/server/prefetch";
import { requireAuth } from "@/server/better-auth/server";
import { HydrateClient } from "@/trpc/server";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

type Props = {
  searchParams: Promise<SearchParams>;
}

const page = async ({ searchParams }: Props) => {
  await requireAuth();
  const params = await workflowsParamsLoader(searchParams);

//   prefetchWorkflows(params);


  return (
    <WorkflowsContainer>
      <HydrateClient>
        <ErrorBoundary fallback={<WorkflowError />}>
          <Suspense fallback={<WorkflowLoading />}>
            <WorkflowsList />
          </Suspense>
        </ErrorBoundary>

      </HydrateClient>
    </WorkflowsContainer>
  )
}

export default page;