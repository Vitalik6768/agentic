// import { Editor, EditorError, EditorLoading } from "@/features/editor/components/editor";
// import { EditorHeader } from "@/features/editor/components/editor-header";
// import { prefetchWorkflow } from "@/app/features/workflows/server/prefetch";
import { EditorError, EditorLoading } from "@/app/features/editor/components/editor";
import { EditorHeader } from "@/app/features/editor/components/editor-header";
import { prefetchWorkflow } from "@/app/features/workflows/server/prefetch";
import { requireAuth } from "@/server/better-auth/server";
import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

interface pageProps {
    params: Promise<{
        workflowsId: string;
    }>
}

const page = async ({ params }: pageProps) => {
    await requireAuth();
    const { workflowsId } = await params;
    prefetchWorkflow(workflowsId);


    return (
        <HydrateClient>
            <ErrorBoundary fallback={<EditorError />}>
                <Suspense fallback={<EditorLoading />}>
                    <EditorHeader workflowId={workflowsId} />
                    {/* <main className="flex-1">
                        <Editor workflowId={workflowsId} />
                    </main> */}
                </Suspense>
            </ErrorBoundary>

        </HydrateClient >
    )
};

export default page;