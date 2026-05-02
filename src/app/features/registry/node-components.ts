import { HttpRequestNode } from "@/app/features/executions/nodes/http-request/node";
import { OpenRouterNode } from "@/app/features/executions/nodes/open-router/node";
import { ManualTriggerNode } from "@/app/features/triggers/manual-trigger/node";
import { InitialNode } from "@/components/initial-node";
import type { NodeTypes } from "@xyflow/react";
import { NodeType } from "generated/prisma";
import { SetNodeNode } from "../executions/nodes/set-node/node";
import { TelegramMessageNode } from "../executions/nodes/telegram-message/node";
import { InterfaceTextNode } from "../executions/nodes/interface-text-node/node";
import { InterfaceTableNode } from "../executions/nodes/interface-table-node/node";
import { ScheduleTriggerNode } from "../triggers/schedule-trigger/node";
import { TelegramTriggerNode } from "../triggers/telegram-trigger/node";
import { WebhookTriggerNode } from "../triggers/webhook-trigger/node";
import { ConditionNode } from "../executions/nodes/condition-node/node";
import { AgentNode } from "../executions/nodes/agent-node/node";
import { ExtractorNode } from "../executions/nodes/extractor-node/node";
import { LoopNode } from "../executions/nodes/loop-node/node";
import { BreakNodeNode } from "../executions/nodes/break-node/node";
import { DelayNode } from "../executions/nodes/delay-node/node";
import { ChatTriggerNode } from "../triggers/chat-trigger/node";
import { GoogleSheetNode } from "../executions/nodes/google-sheet-node/node";
import { GoogleDocsNode } from "../executions/nodes/google-docs-node/node";
import { GoogleDocsFileNode } from "../executions/nodes/google-docs-node-files/node";


export const nodeComponents = {
  [NodeType.INITIAL]: InitialNode,
  [NodeType.MANUAL_TRIGGER]: ManualTriggerNode,
  [NodeType.TELEGRAM_TRIGGER]: TelegramTriggerNode,
  [NodeType.WEBHOOK_TRIGGER]: WebhookTriggerNode,
  [NodeType.CHAT_TRIGGER]: ChatTriggerNode,
  [NodeType.SCHEDULE_TRIGGER]: ScheduleTriggerNode,
  [NodeType.HTTP_REQUEST]: HttpRequestNode,
  [NodeType.OPENROUTER]: OpenRouterNode,
  [NodeType.SET_NODE]: SetNodeNode,
  [NodeType.INTERFACE_TEXT]: InterfaceTextNode,
  [NodeType.INTERFACE_TABLE]: InterfaceTableNode,
  [NodeType.TELEGRAM_MESSAGE]: TelegramMessageNode,
  [NodeType.CONDITION_NODE]: ConditionNode,
  [NodeType.AGENT_NODE]: AgentNode,
  [NodeType.EXTRACTOR_NODE]: ExtractorNode,
  [NodeType.LOOP_NODE]: LoopNode,
  [NodeType.BREAK_NODE]: BreakNodeNode,
  [NodeType.DELAY_NODE]: DelayNode,
  [NodeType.GOOGLE_SHEET]: GoogleSheetNode,
  [NodeType.GOOGLE_DOCS]: GoogleDocsNode,
  [NodeType.GOOGLE_DOCS_FILE]: GoogleDocsFileNode,
} as const satisfies NodeTypes;

export type RegisteredNodeType = keyof typeof nodeComponents;