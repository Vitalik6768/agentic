"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CheckIcon, PencilIcon } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

// Unicode-friendly: allow letters/numbers from any language plus underscore.
// Requires the `u` flag for `\p{...}` property escapes.
export const NODE_VARIABLE_NAME_REGEX = /^[\p{L}_][\p{L}\p{N}_]*$/u;

export function validateNodeVariableName(value: string): string | undefined {
    const t = value.trim();
    if (!t) return "Name is required";
    if (!NODE_VARIABLE_NAME_REGEX.test(t)) {
        return "Use letters (any language), numbers, or underscores (e.g. delayNode1)";
    }
    return undefined;
}

export type NodeDialogNameFieldHandle = {
    getTrimmedName: () => string;
    validate: () => string | undefined;
    focusNameInput: () => void;
    enterEditMode: () => void;
};

type NodeDialogNameFieldProps = {
    open: boolean;
    initialName: string;
    placeholder?: string;
    helpText?: string;
    className?: string;
    /** `header`: prominent title row for dialog top (no inset card). */
    variant?: "default" | "header";
};

export const NodeDialogNameField = forwardRef<NodeDialogNameFieldHandle, NodeDialogNameFieldProps>(
    function NodeDialogNameField(
        {
            open,
            initialName,
            placeholder = "delayNode1",
            helpText = "Canvas label and variable for this step’s output.",
            className,
            variant = "default",
        },
        ref,
    ) {
        const isHeader = variant === "header";
        /** Header title row: cap width so short names don’t stretch edge-to-edge. */
        const headerNameMax = "max-w-[min(100%,16rem)]";
        const nameInputRef = useRef<HTMLInputElement | null>(null);
        const [nameDraft, setNameDraft] = useState(initialName);
        const [nameEditing, setNameEditing] = useState(false);
        const [nameError, setNameError] = useState<string | undefined>();

        useEffect(() => {
            if (!open) return;
            setNameDraft(initialName);
            setNameEditing(false);
            setNameError(undefined);
        }, [open, initialName]);

        useEffect(() => {
            if (!nameEditing) return;
            requestAnimationFrame(() => nameInputRef.current?.focus());
        }, [nameEditing]);

        useImperativeHandle(
            ref,
            () => ({
                getTrimmedName: () => nameDraft.trim(),
                validate: () => validateNodeVariableName(nameDraft),
                focusNameInput: () => {
                    requestAnimationFrame(() => nameInputRef.current?.focus());
                },
                enterEditMode: () => {
                    setNameEditing(true);
                    setNameError(undefined);
                },
            }),
            [nameDraft],
        );

        const commitNameEdit = () => {
            const err = validateNodeVariableName(nameDraft);
            setNameError(err);
            if (!err) setNameEditing(false);
        };

        return (
            <div
                className={cn(
                    isHeader
                        ? "bg-transparent px-0 py-0"
                        : "rounded-md border bg-muted/30 px-3 py-2.5",
                    className,
                )}
            >
                {nameEditing ? (
                    <div className={cn("flex items-start gap-2", isHeader && "w-fit max-w-full")}>
                        <div
                            className={cn(
                                "min-w-0 space-y-1",
                                isHeader ? headerNameMax : "flex-1",
                            )}
                        >
                            <Input
                                ref={nameInputRef}
                                value={nameDraft}
                                onChange={(e) => {
                                    setNameDraft(e.target.value);
                                    setNameError(undefined);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        commitNameEdit();
                                    }
                                    if (e.key === "Escape") {
                                        e.preventDefault();
                                        setNameDraft(initialName);
                                        setNameError(undefined);
                                        setNameEditing(false);
                                    }
                                }}
                                placeholder={placeholder}
                                className={cn(
                                    "h-9",
                                    isHeader && "h-10 w-full text-xl font-semibold tracking-tight",
                                )}
                                aria-invalid={Boolean(nameError)}
                            />
                            {nameError ? (
                                <p className="text-xs text-destructive">{nameError}</p>
                            ) : (
                                <p className="text-xs text-muted-foreground">{helpText}</p>
                            )}
                        </div>
                        <Button
                            type="button"
                            size="icon"
                            variant="secondary"
                            className="shrink-0"
                            onClick={commitNameEdit}
                            aria-label="Save name"
                        >
                            <CheckIcon className="size-4" />
                        </Button>
                    </div>
                ) : (
                    <div className={cn("flex items-center gap-2", isHeader && "w-fit max-w-full")}>
                        <span
                            className={cn(
                                "min-w-0 truncate",
                                isHeader && headerNameMax,
                                isHeader ? "text-xl font-semibold tracking-tight" : "flex-1 font-medium",
                            )}
                            title={nameDraft.trim() || "—"}
                        >
                            {nameDraft.trim() || "—"}
                        </span>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className={cn("shrink-0", isHeader && "h-9 w-9")}
                            onClick={() => {
                                setNameEditing(true);
                                setNameError(undefined);
                            }}
                            aria-label="Edit name"
                        >
                            <PencilIcon className="size-4" />
                        </Button>
                    </div>
                )}
            </div>
        );
    },
);

NodeDialogNameField.displayName = "NodeDialogNameField";
