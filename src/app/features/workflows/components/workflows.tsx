'use client';

// import { EmptyView, EntityContainer, EntityHeader, EntityItem, EntityList, EntityPagination, EntitySearch, ErrorView, LoadingView } from "@/components/entity-components";
import { useCreateWorkflow, useRemoveWorkflow, useSuspenseWorkflows } from "../hooks/use-workflows";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
// import { useWorkflowsParams } from "../hooks/use-workflows-params";
// import { useEntitySearch } from "../hooks/use-entity-search";
// import { Workflow } from "@/generated/prisma/client";
import { WorkflowIcon } from "lucide-react";
import { EmptyView, EntityContainer, EntityHeader, EntityItem, EntityList, ErrorView, LoadingView } from "@/components/entity-components";
import type { Workflow } from "generated/prisma";
import { formatDistanceToNow } from "date-fns";

// export const WorkflowsSearch = () => {
//     const [params, setParams] = useWorkflowsParams();
//     const { searchValue, onSearchChange } = useEntitySearch({ params, setParams });

//     return (
//         <EntitySearch
//             value={searchValue}
//             onChange={onSearchChange}
//             placeholder="Search workflows"
//         />
//     )
// }
export const WorkflowsList = () => {
    const workflows = useSuspenseWorkflows();
    return (
        <EntityList
            items={workflows.data.items}
            renderItem={(workflow) => <WorkflowItem data={workflow} />}
            getKey={(workflow) => workflow.id}
            emptyView={<WorkflowEmpty />}
        />
    )
}
export const WorkflowsHeader = ({ disabled }: { disabled?: boolean }) => {
    const router = useRouter();
    const createWorkflow = useCreateWorkflow();
    const handleCreateWorkflow = () => {
        createWorkflow.mutate(undefined, {
            onSuccess: (data) => {
                router.push(`/workflows/${data.id}`);
            },
            onError: (error) => {
                toast.error(`failed to create workflow ${error.message}`);
            },
        });
    }
    return (
        <>
            <EntityHeader
                title="Workflows"
                description="Manage your workflows"
                onNew={handleCreateWorkflow}
                newButtonLabel="New Workflow"
                disabled={disabled}
                isCreating={createWorkflow.isPending}
            />
        </>

    )
}

// export const WorkflowsPagination = () => {

//     const workflows = useSuspenseWorkflows();
//     const [params, setParams] = useWorkflowsParams();

//     return (
//         <EntityPagination disabled={workflows.isFetching} page={workflows.data.page} totalPages={workflows.data.totalPages} onPageChange={(page) => setParams({ ...params, page })} />
//     )
// }

export const WorkflowsContainer = ({ children }: { children: React.ReactNode }) => {
    return (
        <EntityContainer
            header={<WorkflowsHeader />}
            // search={<WorkflowsSearch />}
            // pagination={<WorkflowsPagination />}
        >

            {children}
        </EntityContainer>

    )
}
export const WorkflowLoading = () => {
    return (
        <LoadingView entity="workflows" message="Loading workflows..." />
    )
}

export const WorkflowError = () => {
    return (
        <ErrorView entity="workflows" message="Error loading workflows..." />
    )
}
export const WorkflowEmpty = () => {
    const router = useRouter();
    const createWorkflow = useCreateWorkflow();
    const handleCreate = () => {
        createWorkflow.mutate(undefined, {
            onError: (error) => {
                toast.error(`failed to create workflow ${error.message}`);
            },
            onSuccess: (data) => {
                router.push(`/workflows/${data.id}`);
            },
        });
    }
    return (
        <>
            <EmptyView onNew={handleCreate} message="you haven't created any workflows yet get started by creating a new workflow" />
        </>
    )
}

export const WorkflowItem = ({ data }: { data: Workflow }) => {
    const removeWorkflow = useRemoveWorkflow();
    const handleRemove = async () => {
        await removeWorkflow.mutateAsync({ id: data.id });
    }
    return (
        <EntityItem
            href={`/workflows/${data.id}`}
            title={data.name}
            subtitle={
                <>
                    Updated {formatDistanceToNow(data.updatedAt)}
                    &bull;
                    Created {formatDistanceToNow(data.createdAt)}

                </>
            }
            image={
                <div className="size-8 flex items-center justify-center">
                    <WorkflowIcon className="size-5 text-muted-foreground" />

                </div>

            }
            onRemove={handleRemove}
            isRemoving={removeWorkflow.isPending}
        />
    )
}