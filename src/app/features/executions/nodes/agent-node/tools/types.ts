export const AGENT_TOOL_IDS = [
  "get_context_variable",
  "list_context_keys",
  "text_interface",
] as const;

export type AgentToolId = (typeof AGENT_TOOL_IDS)[number];

export type AgentToolCategory = "context" | "integration";

export type AgentToolCatalogItem = {
  id: AgentToolId;
  label: string;
  description: string;
  category: AgentToolCategory;
  enabledByDefault: boolean;
  icon?: string;
  configurable?: boolean;
};

export type TextInterfaceToolConfig = {
  interfaceId: string;
  operation: "GET_CONTENT" | "ADD_CONTENT";
  contentSource?: "TEMPLATE" | "AGENT_INPUT";
  body?: string;
};

export type AgentToolSettings = {
  text_interface?: TextInterfaceToolConfig;
};

export type AgentToolsRuntime = {
  safeContext: Record<string, unknown>;
  userId: string;
};

export type BuildAgentToolsParams = AgentToolsRuntime & {
  enabledTools?: string[];
  toolSettings?: Partial<AgentToolSettings>;
};

export const isAgentToolId = (value: string): value is AgentToolId => {
  return (AGENT_TOOL_IDS as readonly string[]).includes(value);
};
