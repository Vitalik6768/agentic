'use client';

import { EmptyView, EntityContainer, EntityHeader, EntityItem, EntityList, EntityPagination, EntitySearch, ErrorView, LoadingView } from "@/components/entity-components";
import { useExecutionsParams } from "../hooks/use-executions-params";
import { formatDistanceToNow } from "date-fns";
import { CheckCircleIcon, ClockIcon, LoaderCircleIcon, XCircleIcon } from "lucide-react";
import { useSuspenseExecutions } from "../hooks/use-executions";
import { ExecutionStatus, type Execution } from "generated/prisma";


export const ExecutionsList = () => {
    const executions = useSuspenseExecutions();
    return (
        <EntityList
            items={executions.data.items}
            renderItem={(execution) => <ExecutionItem data={execution} />}
            getKey={(execution) => execution.id}
            emptyView={<ExecutionsEmpty />}
        />
    )
}
export const ExecutionsHeader = () => {
    return (
        <EntityHeader
            title="Executions"
            description="Manage your executions"
        />
    )
}
export const ExecutionsPagination = () => {
    const executions = useSuspenseExecutions();
    const [params, setParams] = useExecutionsParams();

    return (
        <EntityPagination disabled={executions.isFetching} page={executions.data.page} totalPages={executions.data.totalPages} onPageChange={(page) => setParams({ ...params, page })} />
    )
}
export const ExecutionsContainer = ({ children }: { children: React.ReactNode }) => {
    return (
        <EntityContainer
            header={<ExecutionsHeader />}
            pagination={<ExecutionsPagination />}
        >
            {children}
        </EntityContainer>

    )
}
export const ExecutionsLoading = () => {
    return (
        <LoadingView entity="executions" message="Loading executions..." />
    )
}

export const ExecutionsError = () => {
    return (
        <ErrorView entity="executions" message="Error loading executions..." />
    )
}
export const ExecutionsEmpty = () => {
    return (
        <EmptyView message="you haven't created any executions yet get started by creating a new execution" />
    )
}

const getStatusIcon = (status: ExecutionStatus) => {
    switch (status) {
        case ExecutionStatus.RUNNING:
            return <LoaderCircleIcon className="size-5 object-contain rounded-sm animate-spin" />
        case ExecutionStatus.SUCCESS:
            return <CheckCircleIcon className="size-5 object-contain rounded-sm text-green-500" />
        case ExecutionStatus.FAILED:
            return <XCircleIcon className="size-5 object-contain rounded-sm text-red-500" />
        default:
            return <ClockIcon className="size-5 object-contain rounded-sm text-yellow-500" />
    }
}

const formatStatus = (status: ExecutionStatus) => {
    return status.charAt(0) + status.slice(1).toLocaleLowerCase();
}

export const ExecutionItem = ({ data }: { data: Execution & { workflow: { id: string; name: string } } }) => {
    const duration = data.completedAt ? Math.round(new Date(data.completedAt).getTime() - new Date(data.startedAt).getTime()) / 1000 : 0;

    const subtitle = 
    <>
    {data.workflow.name} &bull;
    started {formatDistanceToNow(data.startedAt, { addSuffix: true })} &bull;
    {duration !== null && <>&bull; Took {duration} seconds</>}
    </>

    return (
        <EntityItem
            href={`/executions/${data.id}`}
            title={formatStatus(data.status)}
            subtitle={subtitle}
            image={
                <div className="size-8 flex items-center justify-center">
                    {getStatusIcon(data.status)}
                </div>
            }
        />
    )
}