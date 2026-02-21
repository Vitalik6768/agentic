import { Button } from "@/components/ui/button"
// import { useExecuteWorkflow } from "@/features/workflows/hooks/use-workflows";
import { FlaskConicalIcon } from "lucide-react"
import { useExecuteWorkflow } from "../../workflows/hooks/use-workflows";



export const ExecuteWorkflowButton = ({workflow}:{workflow:string}) => {
    const executeWorkflow = useExecuteWorkflow();
    const handleExecute = () => {
        executeWorkflow.mutate({
            id: workflow,
        });
    }
    return (
        <Button size="lg"
        onClick={handleExecute} 
        disabled={executeWorkflow.isPending}>
            <FlaskConicalIcon className="size-4" />
            Execute Workflow
        </Button>
    )
}