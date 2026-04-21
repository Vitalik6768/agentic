import {
  ChatInterfaceEditorError,
  ChatInterfaceEditorLoading,
  Editor,
} from "@/app/features/interfaces/chat-interface/components/editor";
import { prefetchChatInterface } from "@/app/features/interfaces/chat-interface/server/prefetch";
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
  prefetchChatInterface(id);

  return (
    <HydrateClient>
      <ErrorBoundary fallback={<ChatInterfaceEditorError />}>
        <Suspense fallback={<ChatInterfaceEditorLoading />}>
          <Editor interfaceId={id} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default page;

