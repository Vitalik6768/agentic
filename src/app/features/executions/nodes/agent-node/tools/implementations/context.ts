import { tool } from "ai";
import { z } from "zod";
type ContextToolsRuntime = {
  safeContext: Record<string, unknown>;
};

export const createContextTools = ({ safeContext }: ContextToolsRuntime) => {
  return {
    get_context_variable: tool({
      description: "Read a value from workflow execution context by key name.",
      inputSchema: z.object({
        name: z.string().min(1),
      }),
      execute: async ({ name }) => {
        return safeContext[name] ?? null;
      },
    }),
    list_context_keys: tool({
      description: "List available top-level keys in workflow execution context.",
      inputSchema: z.object({}),
      execute: async () => {
        return Object.keys(safeContext);
      },
    }),
  };
};
