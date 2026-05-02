"use client";

import { ArrowLeftIcon, BotIcon, BoxesIcon, ChevronRightIcon, FileTextIcon, GitBranchIcon, GlobeIcon, MessagesSquareIcon, MousePointer2Icon, PencilIcon, SearchIcon, XIcon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import React, { useCallback } from "react";
import { Separator } from "./ui/separator";
import { useReactFlow } from "@xyflow/react";
import { toast } from "sonner";
import { createId } from "@paralleldrive/cuid2";
import { NodeType } from "generated/prisma";
import { Input } from "./ui/input";
import { Button } from "./ui/button";


export type NodeTypeOption = {
    type: NodeType;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }> | string;
    categoryId: NodeCategoryId;

}

type NodeCategoryId = "ai" | "interfaces" | "transform" | "flow" | "core";

type NodeCategory = {
  id: NodeCategoryId;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const nodeCategories: NodeCategory[] = [
  {
    id: "ai",
    title: "AI",
    description: "Build autonomous agents, summarize or search documents, etc.",
    icon: BotIcon,
  },
  {
    id: "interfaces",
    title: "Interfaces",
    description: "Work with interface documents like text or tables",
    icon: FileTextIcon,
  },
  {
    id: "transform",
    title: "Data transformation",
    description: "Manipulate, filter or convert data",
    icon: PencilIcon,
  },
  {
    id: "flow",
    title: "Flow",
    description: "Branch, merge or loop the flow, etc.",
    icon: GitBranchIcon,
  },
  {
    id: "core",
    title: "Core",
    description: "Run code, make HTTP requests, set webhooks, etc.",
    icon: BoxesIcon,
  },
];

const triggerNodes: NodeTypeOption[] = [
    {
        type: NodeType.MANUAL_TRIGGER,
        label: "Trigger manually",
        description: "Trigger the workflow manually",
        icon: MousePointer2Icon,
        categoryId: "flow",
    },
    {
        type: NodeType.TELEGRAM_TRIGGER,
        label: "Telegram Trigger",
        description: "Trigger the workflow via Telegram",
        icon: "/logos/telegram.svg",
        categoryId: "core",
    },
    {
        type: NodeType.WEBHOOK_TRIGGER,
        label: "Webhook Trigger",
        description: "Trigger the workflow via HTTP webhook",
        icon: "/logos/webhook.svg",
        categoryId: "core",
    },
    {
        type: NodeType.CHAT_TRIGGER,
        label: "Chat Trigger",
        description: "Trigger the workflow via chat",
        icon: MessagesSquareIcon,
        categoryId: "core",
    },
    {
        type: NodeType.SCHEDULE_TRIGGER,
        label: "Schedule Trigger",
        description: "Trigger the workflow on a schedule",
        icon: "/logos/schedule-trigger.svg",
        categoryId: "flow",
    },
]

const dataTransformationNodes: NodeTypeOption[] = [
    {
        type: NodeType.LOOP_NODE,
        label: "Loop Node",
        description: "Loop through a list of items",
        icon: "/logos/loop-node.svg",
        categoryId: "transform",
    },
    {
        type: NodeType.EXTRACTOR_NODE,
        label: "Extractor Node",
        description: "Extract and transform specific values",
        icon: "/logos/extractor-node.svg",
        categoryId: "transform",
    },
    {
        type: NodeType.SET_NODE,
        label: "Set Node",
        description: "Set a variable in the context",
        icon: "/logos/set-node.svg",
        categoryId: "transform",
    },
    {
        type: NodeType.CONDITION_NODE,
        label: "Condition Node",
        description: "Use a condition node",
        icon: "/logos/condition-node.svg",
        categoryId: "transform",
    },
    {
        type: NodeType.BREAK_NODE,
        label: "Break node",
        description: "Continue the workflow only after the loop’s last iteration",
        icon: "/logos/break-node.svg",
        categoryId: "transform",
    },
    {
        type: NodeType.DELAY_NODE,
        label: "Delay Node",
        description: "Delay the execution of the next node",
        icon: "/logos/delay-node.svg",
        categoryId: "transform",
    },
]

const executionNodes: NodeTypeOption[] = [
    {
        type: NodeType.HTTP_REQUEST,
        label: "HTTP Request",
        description: "Make an HTTP request",
        icon: GlobeIcon,
        categoryId: "core",
    },
    {
        type: NodeType.TELEGRAM_MESSAGE,
        label: "Telegram Message",
        description: "Send a message to a Telegram chat",
        icon: "/logos/telegram-message.svg",
        categoryId: "core",
    },
    {
        type: NodeType.OPENROUTER,
        label: "OpenRouter",
        description: "Use OpenRouter to generate text",
        icon: "/logos/openrouter.svg",
        categoryId: "ai",
    },
    {
        type: NodeType.INTERFACE_TEXT,
        label: "Interface Text",
        description: "Use an interface text",
        icon: "/logos/interface-text.svg",
        categoryId: "interfaces",
    },
    {
        type: NodeType.INTERFACE_TABLE,
        label: "Interface Table",
        description: "Use an interface table",
        icon: "/logos/table-interface.svg",
        categoryId: "interfaces",
    },
    {
        type: NodeType.AGENT_NODE,
        label: "Agent Node",
        description: "Use an agent node",
        icon: "/logos/agent-node.svg",
        categoryId: "ai",
    },
    {
        type: NodeType.GOOGLE_SHEET,
        label: "Google Sheets",
        description: "Read, append, or update a Google Sheet range",
        icon: "/logos/google-sheets.svg",
        categoryId: "core",
    },
    {
        type: NodeType.GOOGLE_DOCS,
        label: "Google Docs",
        description: "Read a Google Doc or append / replace-all text",
        icon: "/logos/google-docs.svg",
        categoryId: "core",
    },
    {
        type: NodeType.GOOGLE_DOCS_FILE,
        label: "Google Doc file",
        description: "Create a blank Google Doc or delete a doc by ID",
        icon: "/logos/google-docs.svg",
        categoryId: "core",
    },

]

interface NodeSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}

export function NodeSelector({ open, onOpenChange, children }: NodeSelectorProps) {
    const { setNodes, getNodes, screenToFlowPosition } = useReactFlow()
  const [query, setQuery] = React.useState("")

  // This picker behaves like a 3-state catalog:
  // - Home: show categories
  // - Category: drill into a category
  // - Search: show matching nodes across categories (grouped by category)
  const [activeCategoryId, setActiveCategoryId] = React.useState<NodeCategoryId | null>(null)

  const matchesQuery = useCallback((n: NodeTypeOption) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      n.label.toLowerCase().includes(q) ||
      n.description.toLowerCase().includes(q) ||
      String(n.type).toLowerCase().includes(q)
    )
  }, [query])

  const isSearching = query.trim().length > 0
  const allNodes = React.useMemo(() => [...triggerNodes, ...executionNodes, ...dataTransformationNodes], [])
  const filteredNodes = React.useMemo(() => allNodes.filter(matchesQuery), [allNodes, matchesQuery])

  React.useEffect(() => {
    // Search is global; if the user starts typing we exit category drill-in so results are complete.
    if (isSearching) setActiveCategoryId(null)
  }, [isSearching])

  const nodesByCategory = React.useMemo(() => {
    // Group search results so the UI can show category headers like "FLOW", "CORE", etc.
    const grouped = new Map<NodeCategoryId, NodeTypeOption[]>()
    for (const n of filteredNodes) {
      const list = grouped.get(n.categoryId) ?? []
      list.push(n)
      grouped.set(n.categoryId, list)
    }
    return grouped
  }, [filteredNodes])

  const activeCategory = React.useMemo(
    () => (activeCategoryId ? nodeCategories.find((c) => c.id === activeCategoryId) ?? null : null),
    [activeCategoryId]
  )

  const activeCategoryNodes = React.useMemo(() => {
    if (!activeCategoryId) return []
    // Category drill-in shows the whole category (not filtered by query).
    return allNodes.filter((n) => n.categoryId === activeCategoryId)
  }, [activeCategoryId, allNodes])

  const renderNodeRow = (nodeType: NodeTypeOption) => {
    const icon = typeof nodeType.icon === "string" ? nodeType.icon : React.createElement(nodeType.icon, { className: "size-6" });
    return (
      <div
        key={nodeType.type}
        className="w-full justify-start h-auto py-5 px-4 rounded-none cursor-pointer border-l-2 border-transparent hover:border-primary hover:bg-muted/50 transition-colors"
        onClick={() => handleNodeSelect(nodeType.type)}
      >
        <div className="flex items-center gap-6 w-full overflow-hidden">
          {typeof icon === "string" ? (
            <img
              src={icon}
              alt={nodeType.label}
              className="size-5 object-contain rounded-sm"
            />
          ) : (
            icon
          )}
          <div className="flex flex-col items-start text-left">
            <span className="font-medium text-sm">
              {nodeType.label}
            </span>
            <span className="text-muted-foreground text-xs">
              {nodeType.description}
            </span>
          </div>
        </div>
      </div>
    )
  }

    const handleNodeSelect = useCallback((nodeType: NodeType) => {
        if (nodeType === NodeType.MANUAL_TRIGGER) {
            const nodes = getNodes()
            const hasManualTrigger = nodes.some((node) => node.type === NodeType.MANUAL_TRIGGER)
            if (hasManualTrigger) {
                toast.error("You can only have one manual trigger")
                return
            }
        }
        setNodes((nodes) => {
            const hasInitialTrigger = nodes.some((node) => node.type === NodeType.INITIAL)
            const centerX = window.innerWidth / 2
            const centerY = window.innerHeight / 2
            const flowPosition = screenToFlowPosition({
                x: centerX + Math.random() - 0.5 * 200,
                y: centerY + Math.random() - 0.5 * 200
            })
            const deselectedNodes = nodes.map((n) =>
                n.selected ? { ...n, selected: false } : n
            );
            const newNode = {
                id: createId(),
                type: nodeType,
                position: flowPosition,
                data:
                    nodeType === NodeType.TELEGRAM_TRIGGER
                        ? { variableName: "telegramTrigger" }
                        : nodeType === NodeType.CHAT_TRIGGER
                            ? { variableName: "chat" }
                            : {},
                selected: true,
                dragging: false,
            }
            if (hasInitialTrigger) {

                return [newNode]

            }
            return [...deselectedNodes, newNode]
        }
        )
        onOpenChange(false)

    }, [onOpenChange, setNodes, getNodes, screenToFlowPosition])
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetTrigger asChild>
                {children}
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
                <SheetHeader>
          <SheetTitle>Add a node</SheetTitle>
          <SheetDescription>Search and pick a node to add to the workflow

                    </SheetDescription>
                </SheetHeader>
        <div className="mt-4 flex items-center gap-2 px-4">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search nodes…"
              className="pl-9 border-border-muted shadow-sm focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
          {query.length > 0 ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <XIcon />
            </Button>
          ) : null}
        </div>
        <div className="mt-4">
          {isSearching ? (
            filteredNodes.length > 0 ? (
              nodeCategories.map((cat) => {
                const nodes = nodesByCategory.get(cat.id) ?? []
                if (nodes.length === 0) return null
                return (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between py-2 px-4">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{cat.title}</span>
                      <span className="text-xs text-muted-foreground">{nodes.length}</span>
                    </div>
                    {nodes.map(renderNodeRow)}
                    <Separator />
                  </div>
                )
              })
            ) : (
              <div className="px-4 py-6 text-sm text-muted-foreground">No nodes match your search.</div>
            )
          ) : activeCategory ? (
            <div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mx-1 hover:cursor-pointer"
                onClick={() => setActiveCategoryId(null)}
              >
                <ArrowLeftIcon className="size-4" />
                Back
              </Button>
              <div className="flex items-center gap-3 px-4 py-3">
                {React.createElement(activeCategory.icon, { className: "size-5 text-muted-foreground" })}
                <div className="flex flex-col">
                  <span className="text-base font-semibold">{activeCategory.title}</span>
                  <span className="text-xs text-muted-foreground">{activeCategory.description}</span>
                </div>
              </div>
              <Separator />
              {activeCategoryNodes.map(renderNodeRow)}
            </div>
          ) : (
            <div>
              {nodeCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="w-full py-4 px-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setActiveCategoryId(cat.id)}
                >
                  <div className="flex items-center gap-4">
                    {React.createElement(cat.icon, { className: "size-5 text-muted-foreground" })}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{cat.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{cat.description}</div>
                    </div>
                    <ChevronRightIcon className="size-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
            </SheetContent>
        </Sheet>
    )
}