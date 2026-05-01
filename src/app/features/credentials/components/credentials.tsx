'use client';

import { EmptyView, EntityContainer, EntityHeader, EntityItem, EntityList, EntityPagination, EntitySearch, ErrorView, LoadingView } from "@/components/entity-components";
import { useRemoveCredential, useSuspenseCredentials } from "../hooks/use-credentials";
import { useRouter } from "next/navigation";
import { useCredentialsParams } from "../hooks/use-credentials-params";
import { useEntitySearch } from "../hooks/use-entity-search";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import type { Credential } from "@/types";
import  { CredentialType } from "@/types";

import Image from "next/image";

export const CredentialsSearch = () => {
    const [params, setParams] = useCredentialsParams();
    const { searchValue, onSearchChange } = useEntitySearch({ params, setParams });

    return (
        <EntitySearch
            value={searchValue}
            onChange={onSearchChange}
            placeholder="Search credentials"
        />
    )
}
export const CredentialsList = () => {
    const credentials = useSuspenseCredentials();
    return (
        <EntityList
            items={credentials.data.items}
            renderItem={(credential) => <CredentialItem data={credential as Credential} />}
            getKey={(credential) => credential.id}
            emptyView={<CredentialsEmpty />}
        />
    )
}
export const CredentialsHeader = ({ disabled }: { disabled?: boolean }) => {

    return (
        <EntityHeader
            title="Credentials"
            description="Manage your credentials"
            newButtonHref="/credentials/new"
            newButtonLabel="New Credential"
            disabled={disabled}
        />


    )
}

export const CredentialsPagination = () => {

    const credentials = useSuspenseCredentials();
    const [params, setParams] = useCredentialsParams();

    return (
        <EntityPagination disabled={credentials.isFetching} page={credentials.data.page} totalPages={credentials.data.totalPages} onPageChange={(page) => setParams({ ...params, page })} />
    )
}

export const CredentialsContainer = ({ children }: { children: React.ReactNode }) => {
    return (
        <EntityContainer
            header={<CredentialsHeader />}
            search={<CredentialsSearch />}
            pagination={<CredentialsPagination />}
        >

            {children}
        </EntityContainer>

    )
}
export const CredentialsLoading = () => {
    return (
        <LoadingView entity="credentials" message="Loading credentials..." />
    )
}

export const CredentialsError = () => {
    return (
        <ErrorView entity="credentials" message="Error loading credentials..." />
    )
}
export const CredentialsEmpty = () => {
    const router = useRouter();
    const handleCreate = () => {
        router.push(`/credentials/new`);
    }
    return (
        <EmptyView onNew={handleCreate} message="you haven't created any credentials yet get started by creating a new credential" />
    )
}

const credentialTypeIcon: Record<CredentialType, React.ReactNode> = {
    [CredentialType.OPENAI]: "/logos/openai.svg",
    [CredentialType.GEMINI]: "/logos/gemini.svg",
    [CredentialType.OPENROUTER]: "/logos/openrouter.svg",
    [CredentialType.SET_NODE]: "/logos/set-node.svg",
    [CredentialType.TELEGRAM_BOT]: "/logos/telegram.svg",
    [CredentialType.GOOGLE]: "/logos/google.svg",

}

export const CredentialItem = ({ data }: { data: Credential }) => {
    const removeCredential = useRemoveCredential();
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);
    const handleRemove = async () => {
        void removeCredential.mutateAsync({ id: data.id });
    }
    const icon = credentialTypeIcon[data.type] ?? "/logos/openrouter.svg";
    const settings =
        data.settings && typeof data.settings === "object" ? (data.settings) : null;
    const googleAuthType = settings && typeof settings.googleAuthType === "string" ? settings.googleAuthType : "";
    const googleOauthTokenEnc =
        settings &&
        typeof (settings.googleOAuth as { tokenEnc?: unknown } | undefined)?.tokenEnc === "string"
            ? ((settings.googleOAuth as { tokenEnc?: unknown }).tokenEnc as string)
            : "";
    const isGoogleOAuthConnected = data.type === CredentialType.GOOGLE && googleAuthType === "OAUTH" && !!googleOauthTokenEnc;
    return (
        <EntityItem
            href={`/credentials/${data.id}`}
            title={data.name}
            subtitle={
                <>
                    Updated{" "}
                    <span suppressHydrationWarning>
                        {mounted ? formatDistanceToNow(data.updatedAt) : ""}
                    </span>
                    &bull;
                    Created{" "}
                    <span suppressHydrationWarning>
                        {mounted ? formatDistanceToNow(data.createdAt) : ""}
                    </span>
                </>
            }
            image={
                <div className="size-8 flex items-center justify-center">
                    <Image src={icon as string} alt={data.type} width={20} height={20} />
                    
                </div>
            }
            actions={
                data.type === CredentialType.GOOGLE ? (
                    <span
                        className={
                            "rounded-full border px-2 py-1 text-[10px] font-medium " +
                            (isGoogleOAuthConnected
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
                                : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200")
                        }
                    >
                        {googleAuthType === "SERVICE_ACCOUNT"
                            ? "Service account"
                            : isGoogleOAuthConnected
                                ? "Connected"
                                : "Not connected"}
                    </span>
                ) : null
            }
            onRemove={handleRemove}
            isRemoving={removeCredential.isPending}
        />
    )
}