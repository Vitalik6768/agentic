"use client";

import {
    NodeDialogNameField,
    type NodeDialogNameFieldHandle,
} from "@/components/node-dialog-name-field";
import {
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Clock } from "lucide-react";
import { forwardRef, type ReactNode } from "react";
import { Button } from "./ui/button";

export type NodeDialogEntityProps = {
    open: boolean;
    initialName: string;
    title: string;
    description: ReactNode;
    icon: ReactNode;
    placeholder?: string;
    helpText?: string;
};

export const NodeDialogEntity = forwardRef<NodeDialogNameFieldHandle, NodeDialogEntityProps>(
    function NodeDialogEntity(
        {
            open,
            initialName,
            title,
            description,
            icon,
            placeholder,
            helpText,
        },
        ref
    ) {
        return (
            <DialogHeader>
                <div className="w-full rounded-t-lg border-b bg-linear-to-r from-blue-100/80 via-blue-50/40 to-blue-50/20 px-6 py-5 dark:from-blue-950/55 dark:via-blue-950/25 dark:to-background">
                    <DialogTitle className="sr-only">{title}</DialogTitle>
                    <div className="flex items-start gap-4">
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-600/20">
                            {icon}
                        </span>
                        <div className="min-w-0 flex-1">
                            <NodeDialogNameField
                                ref={ref}
                                open={open}
                                initialName={initialName}
                                variant="header"
                                placeholder={placeholder}
                                helpText={helpText}
                            />
                        </div>
                    </div>
                </div>
            </DialogHeader>
        );
    }
);

export const NodeDialogEntityFooter = () => {
    return (
        <DialogFooter className="sticky bottom-0 z-10 mt-4 bg-background/95 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/75">
            <Button className="w-full gap-2 bg-linear-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-600/25 transition-all hover:shadow-xl hover:cursor-pointer" type="submit">Save Changes</Button>
        </DialogFooter>
    )
}
