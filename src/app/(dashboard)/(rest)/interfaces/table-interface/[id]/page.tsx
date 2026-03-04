import {
  Editor,
  TableInterfaceEditorError,
  TableInterfaceEditorLoading,
} from "@/app/features/interfaces/table-interface/components/editor";
import { prefetchTableInterface } from "@/app/features/interfaces/table-interface/server/prefetch";
import { requireAuth } from "@/server/better-auth/server";
import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

type PageProps = {
  params: Promise<{ id: string }>;
};

const page = async ({ params }: PageProps) => {
  await requireAuth();
  const { id } = await params;
  prefetchTableInterface(id);

  return (
    <HydrateClient>
      <ErrorBoundary fallback={<TableInterfaceEditorError />}>
        <Suspense fallback={<TableInterfaceEditorLoading />}>
          <Editor interfaceId={id} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default page;