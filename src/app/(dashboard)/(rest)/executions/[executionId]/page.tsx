import { ExecutionView } from "@/app/features/executions/components/execution";
import { ExecutionsError, ExecutionsLoading } from "@/app/features/executions/components/executions";
import { prefetchExecution } from "@/app/features/executions/server/prefetch";
import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";


interface pageProps {
    params: Promise<{
        executionId: string;
    }>
}
const page = async ({ params }: pageProps) => {
    const { executionId } = await params;
    prefetchExecution(executionId);
    return(
    <div className="p-4 md:px-10 md:py-6 h-full">
        <div className="mx-auto max-w-screen-md w-full flex flex-col gap-y-8 h-full">
            <HydrateClient>
                <ErrorBoundary fallback={<ExecutionsError />}>
                    <Suspense fallback={<ExecutionsLoading />}>
                        <ExecutionView executionId={executionId} />
                    </Suspense>
                </ErrorBoundary>
            </HydrateClient>
        </div>
       
    </div>
    );

};

export default page;