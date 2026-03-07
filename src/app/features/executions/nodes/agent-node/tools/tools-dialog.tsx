"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AGENT_TOOL_CATALOG, DEFAULT_AGENT_TOOLS } from "./catalog";
import type { AgentToolId } from "./types";

interface ToolsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTools?: string[];
  onSave: (tools: AgentToolId[]) => void;
}

const EMPTY_SELECTED_TOOLS: string[] = [];

const areSameToolLists = (a: AgentToolId[], b: AgentToolId[]) => {
  if (a.length !== b.length) return false;
  const aSorted = [...a].sort();
  const bSorted = [...b].sort();
  return aSorted.every((toolId, index) => toolId === bSorted[index]);
};

export const ToolsDialog = ({
  open,
  onOpenChange,
  selectedTools,
  onSave,
}: ToolsDialogProps) => {
  const incomingSelectedTools = selectedTools ?? EMPTY_SELECTED_TOOLS;

  const initialSelection = useMemo<AgentToolId[]>(() => {
    if (incomingSelectedTools.length > 0) {
      return incomingSelectedTools.filter((toolId): toolId is AgentToolId =>
        AGENT_TOOL_CATALOG.some((tool) => tool.id === toolId)
      );
    }

    return [...DEFAULT_AGENT_TOOLS];
  }, [incomingSelectedTools]);

  const [enabledTools, setEnabledTools] = useState<AgentToolId[]>(initialSelection);

  useEffect(() => {
    if (!open) return;
    setEnabledTools((current) =>
      areSameToolLists(current, initialSelection) ? current : initialSelection
    );
  }, [open, initialSelection]);

  const toggleTool = (toolId: AgentToolId, nextChecked: boolean) => {
    setEnabledTools((current) => {
      if (nextChecked) {
        return current.includes(toolId) ? current : [...current, toolId];
      }
      return current.filter((id) => id !== toolId);
    });
  };

  const handleSave = () => {
    onSave(enabledTools);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agent Tools</DialogTitle>
          <DialogDescription>
            Select which tools this agent can use during execution.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {AGENT_TOOL_CATALOG.map((tool) => {
            const checked = enabledTools.includes(tool.id);
            return (
              <div
                key={tool.id}
                className="flex items-start justify-between rounded-md border bg-muted/30 p-3"
              >
                <div className="pr-4">
                  <Label htmlFor={`agent-tool-${tool.id}`} className="font-medium">
                    {tool.label}
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">{tool.description}</p>
                </div>
                <Switch
                  id={`agent-tool-${tool.id}`}
                  checked={checked}
                  onCheckedChange={(nextChecked) => toggleTool(tool.id, Boolean(nextChecked))}
                />
              </div>
            );
          })}
        </div>

        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Tools ({enabledTools.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
