import { NodeType } from "generated/prisma";
import type { NodeExecutor } from "../executions/types";
import { manualTriggerExecutor } from "../triggers/manual-trigger/executor";
import { httpRequestExecutor } from "../executions/nodes/http-request/executor";
import { openRouterExecutor } from "../executions/nodes/open-router/executor";
import { setNodeExecutor } from "../executions/nodes/set-node/executor";

export const executerRegistry: Partial<Record<NodeType, NodeExecutor>> = {
    [NodeType.MANUAL_TRIGGER]: manualTriggerExecutor,
    [NodeType.HTTP_REQUEST]: httpRequestExecutor as NodeExecutor,
    [NodeType.INITIAL]: manualTriggerExecutor,
    [NodeType.OPENROUTER]: openRouterExecutor as NodeExecutor,
    [NodeType.SET_NODE]: setNodeExecutor as NodeExecutor,
}

export const getExecutor = (type: NodeType): NodeExecutor => {
    const executor = executerRegistry[type];
    if(!executor) {
        throw new Error(`Executor for node type ${type} not found`);
    }
    return executor;
}