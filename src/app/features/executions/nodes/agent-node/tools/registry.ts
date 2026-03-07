import { DEFAULT_AGENT_TOOLS } from "./catalog";
import type { ToolSet } from "ai";
import { createContextTools } from "./implementations/context";
import { createTextInterfaceTool } from "./implementations/text-interface";
import { isAgentToolId, type BuildAgentToolsParams } from "./types";

export const buildAgentTools = ({
  safeContext,
  userId,
  enabledTools,
  toolSettings,
}: BuildAgentToolsParams): ToolSet => {
  const requestedTools =
    enabledTools && enabledTools.length > 0 ? enabledTools : DEFAULT_AGENT_TOOLS;

  const validToolIds = requestedTools.filter(isAgentToolId);
  const enabledSet = new Set(validToolIds);

  const contextTools = createContextTools({ safeContext });
  const tools: ToolSet = {};

  if (enabledSet.has("get_context_variable")) {
    tools.get_context_variable = contextTools.get_context_variable;
  }

  if (enabledSet.has("list_context_keys")) {
    tools.list_context_keys = contextTools.list_context_keys;
  }

  if (enabledSet.has("text_interface")) {
    tools.text_interface = createTextInterfaceTool({
      userId,
      safeContext,
      config: toolSettings?.text_interface,
    });
  }

  return tools;
};
