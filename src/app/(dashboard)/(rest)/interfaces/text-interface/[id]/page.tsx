import {
  Editor,
  TextInterfaceEditorError,
  TextInterfaceEditorLoading,
} from "@/app/features/interfaces/text-interface/components/editor";
import { prefetchTextInterface } from "@/app/features/interfaces/text-interface/server/prefetch";
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
  prefetchTextInterface(id);

  return (
    <HydrateClient>
      <ErrorBoundary fallback={<TextInterfaceEditorError />}>
        <Suspense fallback={<TextInterfaceEditorLoading />}>
          <Editor interfaceId={id} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default page;