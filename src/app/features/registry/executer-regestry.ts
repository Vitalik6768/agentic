import { NodeType } from "generated/prisma";
import type { NodeExecutor } from "../executions/types";
import { manualTriggerExecutor } from "../triggers/manual-trigger/executor";
import { httpRequestExecutor } from "../executions/nodes/http-request/executor";
import { openRouterExecutor } from "../executions/nodes/open-router/executor";
import { setNodeExecutor } from "../executions/nodes/set-node/executor";
import { telegramTriggerExecutor } from "../triggers/telegram-trigger/executor";
import { telegramMessageExecutor } from "../executions/nodes/telegram-message/executor";
import { webhookTriggerExecutor } from "../triggers/webhook-trigger/executor";
import { scheduleTriggerExecutor } from "../triggers/schedule-trigger/executor";
import { interfaceTextNodeExecutor } from "../executions/nodes/interface-text-node/executor";
import { interfaceTableNodeExecutor } from "../executions/nodes/interface-table-node/executor";
import { conditionNodeExecutor } from "../executions/nodes/condition-node/executor";
import { agentNodeExecutor } from "../executions/nodes/agent-node/executor";
import { extractorNodeExecutor } from "../executions/nodes/extractor-node/executor";
import { loopExecutor } from "../executions/nodes/loop-node/executor";
import { breakNodeExecutor } from "../executions/nodes/break-node/executor";
import { delayNodeExecutor } from "../executions/nodes/delay-node/executor";
import { chatTriggerExecutor } from "../triggers/chat-trigger/executor";
import { googleSheetNodeExecutor } from "../executions/nodes/google-sheet-node/executor";
import { googleDocsNodeExecutor } from "../executions/nodes/google-docs-node/executor";
import { googleDocsFileNodeExecutor } from "../executions/nodes/google-docs-node-files/executor";

export const executerRegistry: Partial<Record<NodeType, NodeExecutor>> = {
    [NodeType.MANUAL_TRIGGER]: manualTriggerExecutor,
    [NodeType.TELEGRAM_TRIGGER]: telegramTriggerExecutor,
    [NodeType.WEBHOOK_TRIGGER]: webhookTriggerExecutor,
    [NodeType.CHAT_TRIGGER]: chatTriggerExecutor,
    [NodeType.SCHEDULE_TRIGGER]: scheduleTriggerExecutor,
    [NodeType.HTTP_REQUEST]: httpRequestExecutor as NodeExecutor,
    [NodeType.INITIAL]: manualTriggerExecutor,
    [NodeType.OPENROUTER]: openRouterExecutor as NodeExecutor,
    [NodeType.SET_NODE]: setNodeExecutor as NodeExecutor,
    [NodeType.INTERFACE_TEXT]: interfaceTextNodeExecutor as NodeExecutor,
    [NodeType.INTERFACE_TABLE]: interfaceTableNodeExecutor as NodeExecutor,
    [NodeType.TELEGRAM_MESSAGE]: telegramMessageExecutor as NodeExecutor,
    [NodeType.CONDITION_NODE]: conditionNodeExecutor as NodeExecutor,
    [NodeType.AGENT_NODE]: agentNodeExecutor as NodeExecutor,
    [NodeType.EXTRACTOR_NODE]: extractorNodeExecutor as NodeExecutor,
    [NodeType.LOOP_NODE]: loopExecutor as NodeExecutor,
    [NodeType.BREAK_NODE]: breakNodeExecutor as NodeExecutor,
    [NodeType.DELAY_NODE]: delayNodeExecutor as NodeExecutor,
    [NodeType.GOOGLE_SHEET]: googleSheetNodeExecutor as NodeExecutor,
    [NodeType.GOOGLE_DOCS]: googleDocsNodeExecutor as NodeExecutor,
    [NodeType.GOOGLE_DOCS_FILE]: googleDocsFileNodeExecutor as NodeExecutor,
}

export const getExecutor = (type: NodeType): NodeExecutor => {
    const executor = executerRegistry[type];
    if(!executor) {
        throw new Error(`Executor for node type ${type} not found`);
    }
    return executor;
}