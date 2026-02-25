import { Button } from "@/components/ui/button"
// import { useExecuteWorkflow } from "@/features/workflows/hooks/use-workflows";
import { FlaskConicalIcon, LoaderCircleIcon } from "lucide-react"
import { useExecuteWorkflow } from "../../workflows/hooks/use-workflows";



export const ExecuteWorkflowButton = ({workflow}:{workflow:string}) => {
    const executeWorkflow = useExecuteWorkflow();
    const handleExecute = () => {
        executeWorkflow.mutate({
            id: workflow,
        });
    }
    return (
        <Button
        size="lg"
        onClick={handleExecute}
        disabled={executeWorkflow.isPending}
        className="gap-2 bg-blue-600 px-6 font-semibold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg hover:cursor-pointer"
        >
            {executeWorkflow.isPending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
                <FlaskConicalIcon className="size-4" />
            )}
            {executeWorkflow.isPending ? "Executing..." : "Execute Workflow"}
        </Button>
    )
}