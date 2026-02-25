import { NodeType } from "generated/prisma";
import type { NodeExecutor } from "../types";
import { manualTriggerExecutor } from "../../triggers/manual-trigger/executor";
import { httpRequestExecutor } from "../nodes/http-request/executor";
import { openRouterExecutor } from "../nodes/open-router/executor";

export const executerRegistry: Partial<Record<NodeType, NodeExecutor>> = {
    [NodeType.MANUAL_TRIGGER]: manualTriggerExecutor,
    [NodeType.HTTP_REQUEST]: httpRequestExecutor as NodeExecutor,
    [NodeType.INITIAL]: manualTriggerExecutor,
    [NodeType.OPENROUTER]: openRouterExecutor as NodeExecutor,
}

export const getExecutor = (type: NodeType): NodeExecutor => {
    const executor = executerRegistry[type];
    if(!executor) {
        throw new Error(`Executor for node type ${type} not found`);
    }
    return executor;
}