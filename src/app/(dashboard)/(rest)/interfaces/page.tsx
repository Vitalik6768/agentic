import {
  InterfacesContainer,
  InterfacesError,
  InterfacesList,
  InterfacesLoading,
} from "@/app/features/interfaces/components/interfaces";
import { prefetchInterfaces } from "@/app/features/interfaces/server/prefetch";
import { requireAuth } from "@/server/better-auth/server";
import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

const page = async () => {
  await requireAuth();
  prefetchInterfaces();

  return (
    <InterfacesContainer>
      <HydrateClient>
        <ErrorBoundary fallback={<InterfacesError />}>
          <Suspense fallback={<InterfacesLoading />}>
            <InterfacesList />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </InterfacesContainer>
  );
};

export default page;