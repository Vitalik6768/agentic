// import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import Handlebars from "handlebars";
import { generateText } from "ai";
import { openRouterChannel } from "@/inngest/channels/open-router";
import {  db } from "@/server/db";
import { decrypt } from "@/lib/encryption";
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { NodeExecutor } from "../../types";



Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  const safeString = new Handlebars.SafeString(jsonString);
  return safeString;
  // return JSON.stringify(context, null, 2);
});

type OpenRouterData = {
  varibleName: string;
  credentialId: string;
  systemPrompt?: string;
  userPrompt: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
};

const extractTextParts = (content: unknown): string => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object") {
        const partText = (part as { text?: unknown }).text;
        if (typeof partText === "string") return partText;

        const partValue = (part as { value?: unknown }).value;
        if (typeof partValue === "string") return partValue;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
};

const extractModelText = (wrappedResult: unknown): string => {
  const wrapped = asRecord(wrappedResult);
  const generation = asRecord(wrapped?.result) ?? wrapped;

  if (!generation) {
    return "";
  }

  const directText = generation.text;
  if (typeof directText === "string" && directText.trim().length > 0) {
    return directText;
  }

  const steps = Array.isArray(wrapped?.steps) ? wrapped.steps : [];
  const firstStep = asRecord(steps[0]);
  const stepContent = Array.isArray(firstStep?.content) ? firstStep.content : [];
  const firstContent = asRecord(stepContent[0]);
  const stepText = firstContent?.text;
  if (typeof stepText === "string" && stepText.trim().length > 0) {
    return stepText;
  }

  const response = asRecord(generation.response);
  const responseMessages = Array.isArray(response?.messages) ? response.messages : null;
  if (Array.isArray(responseMessages)) {
    const messagesText = responseMessages
      .map((msg) => extractTextParts(asRecord(msg)?.content))
      .filter((text) => text.trim().length > 0)
      .join("\n");
    if (messagesText.trim().length > 0) {
      return messagesText;
    }
  }

  const responseBody = asRecord(response?.body);
  const choices = Array.isArray(responseBody?.choices) ? responseBody.choices : [];
  const firstChoice = asRecord(choices[0]);
  const message = asRecord(firstChoice?.message);
  const rawChoiceContent = message?.content;
  const choiceText = extractTextParts(rawChoiceContent);
  if (choiceText.trim().length > 0) {
    return choiceText;
  }

  return "";
};
export const openRouterExecutor: NodeExecutor<OpenRouterData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    openRouterChannel().status({
      nodeId,
      status: "loading",
    })
  );
  if (!data.varibleName) {
    await publish(
      openRouterChannel().status({
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
      openRouterChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError("User prompt is required");
  }

  const systemPromptBase = data.systemPrompt
    ? Handlebars.compile(data.systemPrompt)(context)
    : "you are a helpful assistant";
  const systemPrompt = `${systemPromptBase}\n\nReturn only the final answer for the user. Do not include internal reasoning, analysis steps, or self-reflection.`;
  const userPrompt = Handlebars.compile(data.userPrompt)(context);

  const credential = await step.run("get-credential", async () => {
    return await db.credential.findUniqueOrThrow({
      where: {
        id: data.credentialId,
      },
    });
  });

  if(!credential) {
    throw new NonRetriableError("open router credential not found");
  }


 
  const openrouter = createOpenRouter({
    apiKey: decrypt(credential.value),
  });
  try {
    const text = await step.run("openrouter-generate-text", async () => {
      const result = await generateText({
        model: openrouter("google/gemini-3.1-pro-preview"),
        prompt: userPrompt,
        system: systemPrompt,
        providerOptions: {
          openrouter: {
            reasoning: {
              exclude: true,
            },
          },
        },
      });

      return extractModelText(result);
    });
    await publish(
      openRouterChannel().status({
        nodeId,
        status: "success",
      })
    );
    return { 
      ...context,
      [data.varibleName]: text,

    };

  } catch (error) {
    await publish(
      openRouterChannel().status({
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