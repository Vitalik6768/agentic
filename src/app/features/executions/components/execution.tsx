"use client";

import { CheckCircleIcon, ClockIcon, LoaderCircleIcon, XCircleIcon } from "lucide-react"
import { useSuspenseExecution } from "../hooks/use-executions"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { formatDistance, formatDistanceToNow } from "date-fns";
import { ExecutionStatus } from "generated/prisma";

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

export const ExecutionView = ({ executionId }: { executionId: string }) => {
    const { data: execution } = useSuspenseExecution(executionId);
    const [showStackTrace, setShowStackTrace] = useState(false);
    const duration = execution.completedAt ? Math.round((new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()) / 1000) : 0;

    return (
        <Card className="shadow-none">
            <CardHeader>
                <div className="flex items-center gap-3">
                    {getStatusIcon(execution.status)}
                    <div>
                        <CardTitle>{formatStatus(execution.status)}</CardTitle>
                        <CardDescription> Execution of {execution.workflow.name}</CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-sm font-medium text-muted-foreground">
                            <p>Workflow</p>
                            <Link
                                prefetch
                                className="text-sm text-primary hover:underline"
                                href={`/workflows/${execution.workflow.id}`}>
                                {execution.workflow.name}
                            </Link>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">status</p>
                            <p className="text-sm">{formatStatus(execution.status)}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">started at</p>
                            <p className="text-sm">{formatDistanceToNow(execution.startedAt, { addSuffix: true })}</p>
                        </div>

                        {execution.completedAt && (
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">completed at</p>
                                <p className="text-sm">{formatDistanceToNow(execution.completedAt, { addSuffix: true })}</p>
                            </div>
                        )}
                         {duration !== null ? (
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">duration</p>
                            <p className="text-sm">{duration}s</p>
                        </div>
                    ) : (
                        null
                    )}
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">inngest event id</p>
                        <p className="text-sm">{execution.inngestEventId}</p>
                    </div>

                    {execution.error && (
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">error</p>
                            <p className="text-sm">{execution.error}</p>
                        </div>
                    )}

                    {execution.output && (
                        <div className="mt-4 col-span-2">
                            <p className="text-sm font-medium text-muted-foreground">output</p>
                            <pre className="text-sm bg-muted p-4 rounded-md overflow-x-auto max-w-full whitespace-pre">{JSON.stringify(execution.output, null, 2)}</pre>
                        </div>
                    )}

                    </div>

                   
                </div>
            </CardContent>
        </Card>

    )

}