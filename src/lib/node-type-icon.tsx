"use client";

import { cn } from "@/lib/utils";
import { BoxIcon, GlobeIcon, MousePointer2Icon, type LucideIcon } from "lucide-react";

type IconSource = string | LucideIcon;

const NODE_TYPE_ICONS: Record<string, IconSource> = {
  INITIAL: BoxIcon,
  MANUAL_TRIGGER: MousePointer2Icon,
  TELEGRAM_TRIGGER: "/logos/telegram.svg",
  WEBHOOK_TRIGGER: "/logos/webhook.svg",
  SCHEDULE_TRIGGER: "/logos/schedule-trigger.svg",
  GOOGLE_FORM_TRIGGER: "/logos/googleform.svg",
  HTTP_REQUEST: GlobeIcon,
  SERP_API_NODE: "/logos/serp-api.svg",
  TELEGRAM_MESSAGE: "/logos/telegram-message.svg",
  OPENROUTER: "/logos/openrouter.svg",
  OPENAI: "/logos/openai.svg",
  GEMINI: "/logos/gemini.svg",
  INTERFACE_TEXT: "/logos/interface-text.svg",
  INTERFACE_TABLE: "/logos/table-interface.svg",
  GOOGLE_SHEET: "/logos/google-sheets.svg",
  GOOGLE_DOCS: "/logos/google-docs.svg",
  AGENT_NODE: "/logos/agent-node.svg",
  LOOP_NODE: "/logos/loop-node.svg",
  EXTRACTOR_NODE: "/logos/extractor-node.svg",
  SET_NODE: "/logos/set-node.svg",
  CONDITION_NODE: "/logos/condition-node.svg",
  BREAK_NODE: "/logos/break-node.svg",
  DELAY_NODE: "/logos/delay-node.svg",
};

export function NodeTypeIcon({
  flowNodeType,
  className,
  imgClassName,
}: {
  flowNodeType?: string;
  className?: string;
  imgClassName?: string;
}) {
  const key = flowNodeType?.trim() ?? "";
  const source = key ? NODE_TYPE_ICONS[key] : undefined;
  if (!source) {
    return <BoxIcon className={cn("size-4 shrink-0 text-muted-foreground", className)} aria-hidden />;
  }
  if (typeof source === "string") {
    return (
      <img
        src={source}
        alt=""
        className={cn("size-4 shrink-0 object-contain", imgClassName)}
        aria-hidden
      />
    );
  }
  const Icon = source;
  return <Icon className={cn("size-4 shrink-0 text-muted-foreground", className)} aria-hidden />;
}
