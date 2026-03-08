import { Button } from "@/components/ui/button"
// import { useExecuteWorkflow } from "@/features/workflows/hooks/use-workflows";
import { FlaskConicalIcon, LoaderCircleIcon } from "lucide-react"
import { useExecuteWorkflow, useUpdateWorkflow } from "../../workflows/hooks/use-workflows";
import { useAtomValue } from "jotai";
import { editorAtom } from "../store/atoms";



export const ExecuteWorkflowButton = ({workflow}:{workflow:string}) => {
    const editor = useAtomValue(editorAtom);
    const saveWorkflow = useUpdateWorkflow();
    const executeWorkflow = useExecuteWorkflow();
    const handleExecute = async () => {
        if (!editor) {
            return;
        }

        const nodes = editor.getNodes();
        const edges = editor.getEdges();

        await saveWorkflow.mutateAsync({
            id: workflow,
            nodes,
            edges,
        });

        executeWorkflow.mutate({
            id: workflow,
        });
    }
    return (
        <Button
        size="lg"
        onClick={handleExecute}
        disabled={executeWorkflow.isPending || saveWorkflow.isPending}
        className="gap-2 bg-blue-600 px-6 font-semibold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg hover:cursor-pointer"
        >
            {executeWorkflow.isPending || saveWorkflow.isPending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
                <FlaskConicalIcon className="size-4" />
            )}
            {saveWorkflow.isPending
                ? "Saving..."
                : executeWorkflow.isPending
                  ? "Executing..."
                  : "Execute Workflow"}
        </Button>
    )
}