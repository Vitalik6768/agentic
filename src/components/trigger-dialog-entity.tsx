"use client";

import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ReactNode } from "react";

export type TriggerDialogEntityProps = {
  title: string;
  description: ReactNode;
  icon: ReactNode;
};

export function TriggerDialogEntity({ title, description, icon }: TriggerDialogEntityProps) {
  return (
    <DialogHeader>
      <div className="w-full rounded-t-lg border-b bg-linear-to-r from-blue-100/80 via-blue-50/40 to-blue-50/20 px-6 py-5 dark:from-blue-950/55 dark:via-blue-950/25 dark:to-background">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="flex items-start gap-4">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-600/20">
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-semibold leading-tight text-foreground">{title}</div>
            <DialogDescription className="pt-3">{description}</DialogDescription>
          </div>
        </div>
      </div>
    </DialogHeader>
  );
}

