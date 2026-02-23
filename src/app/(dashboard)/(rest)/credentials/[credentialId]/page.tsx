import { CredentialView } from "@/app/features/credentials/components/credential";
import { prefetchCredential } from "@/app/features/credentials/server/prefetch";
import { requireAuth } from "@/server/better-auth/server";
import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

interface pageProps {
  params: Promise<{
    credentialId: string;
  }>
}

const Page = async ({ params }: pageProps) => {
  await requireAuth();

  const { credentialId } = await params;

  prefetchCredential(credentialId);


  return (
    <div className="p-4 md:px-10 md:py-6 h-full">
      <div className="mx-auto max-w-screen-md w-full flex flex-col gap-y-8 h-full">
        <HydrateClient>
          <ErrorBoundary fallback={<p>Error</p>}>
            <Suspense fallback={<p>Loading...</p>}>
              <CredentialView credentialId={credentialId} />
            </Suspense>
          </ErrorBoundary>
        </HydrateClient>

      </div>
    </div>
  )
};

export default Page;