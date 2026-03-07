import { NonRetriableError } from "inngest";
import Handlebars from "handlebars";
import { ToolLoopAgent, stepCountIs, type ToolSet } from "ai";
import {  db } from "@/server/db";
import { decrypt } from "@/lib/encryption";
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { NodeExecutor } from "../../types";
import { registerHandlebarsHelpers } from "@/lib/handlebars-helpers";
import { DEFAULT_OPEN_ROUTER_MODEL, isOpenRouterModel } from "@/config/constans";
import { agentNodeChannel } from "@/inngest/channels/agent-node";
import { buildAgentTools } from "./tools/registry";
import type { AgentToolId, AgentToolSettings } from "./tools/types";

registerHandlebarsHelpers();

type AgentNodeData = {
  varibleName: string;
  credentialId: string;
  systemPrompt?: string;
  userPrompt: string;
  model?: string;
  enabledTools?: AgentToolId[];
  toolSettings?: Partial<AgentToolSettings>;
};

const renderTemplate = (
  template: string,
  context: Record<string, unknown>,
  fieldLabel: "systemPrompt" | "userPrompt",
): string => {
  try {
    return Handlebars.compile(template, { noEscape: true })(context);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown template error";
    throw new NonRetriableError(`Invalid ${fieldLabel} template: ${message}`);
  }
};

export const agentNodeExecutor: NodeExecutor<AgentNodeData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(
    agentNodeChannel().status({
      nodeId,
      status: "loading",
    })
  );
  if (!data.varibleName) {
    await publish(
      agentNodeChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError("Variable name is required");
  }

  if(!data.credentialId) {
    throw new NonRetriableError("open router credential not found");
  }

  if(!data.userPrompt) {
    await publish(
      agentNodeChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError("User prompt is required");
  }

  const safeContext = (context && typeof context === "object"
    ? context
    : {}) as Record<string, unknown>;

  const systemPromptBase = data.systemPrompt
    ? renderTemplate(data.systemPrompt, safeContext, "systemPrompt")
    : "you are a helpful assistant";
  const systemPrompt = `${systemPromptBase}\n\nReturn only the final answer for the user. Do not include internal reasoning, analysis steps, or self-reflection.`;
  const userPrompt = renderTemplate(data.userPrompt, safeContext, "userPrompt");

  const credential = await step.run("get-credential", async () => {
    return await db.credential.findUniqueOrThrow({
      where: {
        id: data.credentialId,
      },
    });
  });

  if(!credential) {
    throw new NonRetriableError("agent credential not found");
  }


 
  const openrouter = createOpenRouter({
    apiKey: decrypt(credential.value),
  });
  const selectedModel =
    data.model && isOpenRouterModel(data.model)
      ? data.model
      : DEFAULT_OPEN_ROUTER_MODEL;
  try {
    const text = await step.run("openrouter-agent-run", async () => {
      const agent = new ToolLoopAgent({
        model: openrouter(selectedModel),
        instructions: systemPrompt,
        stopWhen: stepCountIs(5),
        tools: buildAgentTools({
          safeContext,
          userId,
          enabledTools: data.enabledTools,
          toolSettings: data.toolSettings,
        }),
        providerOptions: {
          openrouter: {
            reasoning: { exclude: true },
          },
        },
      });

      const result = await agent.generate({
        prompt: userPrompt,
      });

      return result.text ?? "";
    });
    await publish(
      agentNodeChannel().result({
        nodeId,
        status: "success",
        output: text,
      })
    );
    await publish(
      agentNodeChannel().status({
        nodeId,
        status: "success",
      })
    );
    return { 
      ...context,
      [data.varibleName]: text,

    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown OpenRouter error";
    await publish(
      agentNodeChannel().result({
        nodeId,
        status: "error",
        error: errorMessage,
      })
    );
    await publish(
      agentNodeChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }

  //   const result = await step.run(
  //     `execute http request ${nodeId}`,
  //     async () => context
  //   );
};