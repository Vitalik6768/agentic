import { HttpRequestNode } from "@/app/features/executions/nodes/http-request/node";
import { OpenRouterNode } from "@/app/features/executions/nodes/open-router/node";
import { ManualTriggerNode } from "@/app/features/triggers/manual-trigger/node";
import { InitialNode } from "@/components/initial-node";
import type { NodeTypes } from "@xyflow/react";
import { NodeType } from "generated/prisma";
import { SetNodeNode } from "../executions/nodes/set-node/node";
import { TelegramTriggerNode } from "../triggers/telegram-trigger/node";
// import { DiscordNode } from "@/features/executions/components/discord/node";
// import { GeminiNode } from "@/features/executions/components/gemini/node";
// import { HttpRequestNode } from "@/features/executions/components/http-request/node";
// import { OpenAiNode } from "@/features/executions/components/openai/node";
// import { SlackNode } from "@/features/executions/components/slack/node";
// import { GoogleFormTriggerNode } from "@/features/triggers/components/google-form-trigger/node";
// import { ManualTriggerNode } from "@/features/triggers/components/manual-trigger/node";
// import { NodeType } from "@/generated/prisma";
// import { NodeTypes } from "@xyflow/react";

export const nodeComponents = {
  [NodeType.INITIAL]: InitialNode,
  [NodeType.MANUAL_TRIGGER]: ManualTriggerNode,
  [NodeType.TELEGRAM_TRIGGER]: TelegramTriggerNode,
  [NodeType.HTTP_REQUEST]: HttpRequestNode,
  [NodeType.OPENROUTER]: OpenRouterNode,
  [NodeType.SET_NODE]: SetNodeNode,
//   [NodeType.GOOGLE_FORM_TRIGGER]: GoogleFormTriggerNode,
//   [NodeType.GEMINI]: GeminiNode,
//   [NodeType.OPENAI]: OpenAiNode,
//   [NodeType.DISCORD]: DiscordNode,
//   [NodeType.SLACK]: SlackNode,
} as const satisfies NodeTypes;

export type RegisteredNodeType = keyof typeof nodeComponents;