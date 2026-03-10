import type { AgentToolCatalogItem } from "./types";

export const AGENT_TOOL_CATALOG: readonly AgentToolCatalogItem[] = [
  // {
  //   id: "get_context_variable",
  //   label: "Get Context Variable",
  //   description: "Read a specific top-level value from workflow context.",
  //   category: "context",
  //   enabledByDefault: true,
  //   icon: "/logos/agent-node.svg",
  //   configurable: false,
  // },
  // {
  //   id: "list_context_keys",
  //   label: "List Context Keys",
  //   description: "List available top-level keys from workflow context.",
  //   category: "context",
  //   enabledByDefault: true,
  //   icon: "/logos/agent-node.svg",
  //   configurable: false,
  // },
  {
    id: "text_interface",
    label: "Text Interface",
    description: "Read or append content from an Interface Text document.",
    category: "integration",
    enabledByDefault: false,
    icon: "/logos/interface-text.svg",
    configurable: true,
  },
  {
    id: "table_interface",
    label: "Table Interface",
    description: "Read or append content from an Interface Table document.",
    category: "integration",
    enabledByDefault: false,
    icon: "/logos/table-interface.svg",
    configurable: true,
  },
] as const;

export const DEFAULT_AGENT_TOOLS = AGENT_TOOL_CATALOG
  .filter((item) => item.enabledByDefault)
  .map((item) => item.id);
