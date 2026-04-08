"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
import { ExecutionOutputPanel } from "@/components/data-transfer";
import { NodeDialogEntityFooter } from "@/components/node-dialog-entity";
import { TriggerDialogEntity } from "@/components/trigger-dialog-entity";
import { TRIGGER_DIALOG_CONTENT_STYLE, TRIGGER_PANELS_STYLES } from "../trigger-constants";
import { Clock } from "lucide-react";
import z from "zod";

const formSchema = z.object({
    cronExpression: z
        .string()
        .min(1, { message: "Cron expression is required" })
        .refine((value) => value.trim().split(/\s+/).length >= 5, {
            message: "Cron expression must have at least 5 parts",
        }),
    timezone: z.string().min(1, { message: "Timezone is required" }),
    enabled: z.boolean(),
    misfirePolicy: z.enum(["SKIP_MISSED", "RUN_ONCE_IF_MISSED", "CATCH_UP"]),
    maxDelaySec: z.number().int().nonnegative().optional(),
});

export type ScheduleTriggerFormValues = z.infer<typeof formSchema>;

type TriggerInterval = "MINUTES" | "HOURS" | "DAYS";

type CronBuilderState = {
    interval: TriggerInterval;
    every: number;
    hour: number;
    minute: number;
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => {
    const normalized = hour % 12 === 0 ? 12 : hour % 12;
    const suffix = hour < 12 ? "am" : "pm";
    return {
        value: String(hour),
        label: `${normalized}${suffix}`,
    };
});

const clampNumber = (value: number, min: number, max: number) => {
    if (Number.isNaN(value)) return min;
    return Math.max(min, Math.min(max, value));
};

const toCronExpression = (state: CronBuilderState) => {
    const every = Math.max(1, Math.floor(state.every));
    const hour = clampNumber(Math.floor(state.hour), 0, 23);
    const minute = clampNumber(Math.floor(state.minute), 0, 59);

    switch (state.interval) {
        case "MINUTES":
            return `*/${every} * * * *`;
        case "HOURS":
            return `${minute} */${every} * * *`;
        case "DAYS":
            return `${minute} ${hour} */${every} * *`;
        default:
            return "*/5 * * * *";
    }
};

const parseCronBuilder = (cronExpression: string): CronBuilderState | null => {
    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length < 5) return null;
    const minutePart = parts[0] ?? "";
    const hourPart = parts[1] ?? "";
    const dayPart = parts[2] ?? "";

    const minuteEvery = /^\*\/(\d+)$/.exec(minutePart);
    if (minuteEvery) {
        return {
            interval: "MINUTES",
            every: Math.max(1, Number(minuteEvery[1])),
            hour: 0,
            minute: 0,
        };
    }

    const hourEvery = /^\*\/(\d+)$/.exec(hourPart);
    if (hourEvery && /^\d+$/.test(minutePart)) {
        return {
            interval: "HOURS",
            every: Math.max(1, Number(hourEvery[1])),
            hour: 0,
            minute: clampNumber(Number(minutePart), 0, 59),
        };
    }

    const dayEvery = /^\*\/(\d+)$/.exec(dayPart);
    if (dayEvery && /^\d+$/.test(minutePart) && /^\d+$/.test(hourPart)) {
        return {
            interval: "DAYS",
            every: Math.max(1, Number(dayEvery[1])),
            hour: clampNumber(Number(hourPart), 0, 23),
            minute: clampNumber(Number(minutePart), 0, 59),
        };
    }

    return null;
};

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: ScheduleTriggerFormValues) => void;
    defaultValues?: Partial<ScheduleTriggerFormValues>;
    executionStatus?: NodeStatus;
}

export const ScheduleTriggerDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues = {},
    executionStatus = "initial",
}: Props) => {
    const [builder, setBuilder] = useState<CronBuilderState>({
        interval: "MINUTES",
        every: 5,
        hour: 0,
        minute: 0,
    });
    const form = useForm<ScheduleTriggerFormValues>({
        resolver: zodResolver(formSchema),
        shouldUnregister: false,
        defaultValues: {
            cronExpression: defaultValues.cronExpression ?? "*/5 * * * *",
            timezone: defaultValues.timezone ?? "UTC",
            enabled: defaultValues.enabled ?? true,
            misfirePolicy: defaultValues.misfirePolicy ?? "SKIP_MISSED",
            maxDelaySec: defaultValues.maxDelaySec,
        },
    });

    useEffect(() => {
        if (open) {
            const cron = defaultValues.cronExpression ?? "*/5 * * * *";
            const parsedBuilder = parseCronBuilder(cron);
            setBuilder(
                parsedBuilder ?? {
                    interval: "MINUTES",
                    every: 5,
                    hour: 0,
                    minute: 0,
                },
            );
            form.reset({
                cronExpression: cron,
                timezone: defaultValues.timezone ?? "UTC",
                enabled: defaultValues.enabled ?? true,
                misfirePolicy: defaultValues.misfirePolicy ?? "SKIP_MISSED",
                maxDelaySec: defaultValues.maxDelaySec,
            });
        }
    }, [defaultValues, open, form]);

    const handleSubmit = (values: ScheduleTriggerFormValues) => {
        onSubmit(values);
        onOpenChange(false);
    };

    const applyBuilder = () => {
        form.setValue("cronExpression", toCronExpression(builder), {
            shouldDirty: true,
            shouldValidate: true,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={TRIGGER_DIALOG_CONTENT_STYLE}>
                <TriggerDialogEntity
                    title="Schedule Trigger"
                    description="Configure when this workflow should run automatically."
                    icon={<Clock className="h-6 w-6 opacity-95" />}
                />
                <div className={TRIGGER_PANELS_STYLES}>
                    <div className="max-h-[72vh] overflow-y-auto pr-1">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                            <FormField
                                control={form.control}
                                name="enabled"
                                render={({ field }) => (
                                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                        <div className="space-y-0.5">
                                            <FormLabel>Enabled</FormLabel>
                                            <FormDescription>Allow this schedule to trigger workflow runs.</FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="cronExpression"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cron Expression</FormLabel>
                                        <FormControl>
                                            <Input placeholder="*/5 * * * *" {...field} />
                                        </FormControl>
                                        <FormDescription>Example: `*/5 * * * *` runs every 5 minutes.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="space-y-4 rounded-md border p-4">
                                <p className="border-b pb-2 text-sm font-semibold">Trigger Rules</p>

                                <div className="space-y-2">
                                    <FormLabel>Trigger Interval</FormLabel>
                                    <Select
                                        value={builder.interval}
                                        onValueChange={(value) =>
                                            setBuilder((prev) => ({
                                                ...prev,
                                                interval: value as TriggerInterval,
                                            }))
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="MINUTES">Minutes</SelectItem>
                                            <SelectItem value="HOURS">Hours</SelectItem>
                                            <SelectItem value="DAYS">Days</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <FormLabel>
                                        {builder.interval === "MINUTES"
                                            ? "Minutes Between Triggers"
                                            : builder.interval === "HOURS"
                                              ? "Hours Between Triggers"
                                              : "Days Between Triggers"}
                                    </FormLabel>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={builder.interval === "DAYS" ? 31 : 999}
                                        value={builder.every}
                                        onChange={(event) =>
                                            setBuilder((prev) => ({
                                                ...prev,
                                                every: clampNumber(
                                                    Number(event.target.value || 1),
                                                    1,
                                                    prev.interval === "DAYS" ? 31 : 999,
                                                ),
                                            }))
                                        }
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Must be in range 1-{builder.interval === "DAYS" ? "31" : "999"}
                                    </p>
                                </div>

                                {builder.interval !== "MINUTES" && (
                                    <>
                                        {builder.interval === "DAYS" && (
                                            <div className="space-y-2">
                                                <FormLabel>Trigger at Hour</FormLabel>
                                                <Select
                                                    value={String(builder.hour)}
                                                    onValueChange={(value) =>
                                                        setBuilder((prev) => ({
                                                            ...prev,
                                                            hour: clampNumber(Number(value), 0, 23),
                                                        }))
                                                    }
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {HOUR_OPTIONS.map((option) => (
                                                            <SelectItem key={option.value} value={option.value}>
                                                                {option.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <FormLabel>Trigger at Minute</FormLabel>
                                            <Input
                                                type="number"
                                                min={0}
                                                max={59}
                                                value={builder.minute}
                                                onChange={(event) =>
                                                    setBuilder((prev) => ({
                                                        ...prev,
                                                        minute: clampNumber(Number(event.target.value || 0), 0, 59),
                                                    }))
                                                }
                                            />
                                        </div>
                                    </>
                                )}

                                <Button type="button" variant="outline" className="w-full" onClick={applyBuilder}>
                                    Apply Trigger Rules
                                </Button>
                            </div>

                            <FormField
                                control={form.control}
                                name="timezone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Timezone</FormLabel>
                                        <FormControl>
                                            <Input placeholder="UTC" {...field} />
                                        </FormControl>
                                        <FormDescription>Use IANA timezone, e.g. `Europe/Berlin`.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="misfirePolicy"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Misfire Policy</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="SKIP_MISSED">Skip Missed</SelectItem>
                                                <SelectItem value="RUN_ONCE_IF_MISSED">Run Once If Missed</SelectItem>
                                                <SelectItem value="CATCH_UP">Catch Up</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="maxDelaySec"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Max Delay (seconds)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={0}
                                                placeholder="Optional"
                                                value={field.value ?? ""}
                                                onChange={(event) => {
                                                    const value = event.target.value;
                                                    field.onChange(value === "" ? undefined : Number(value));
                                                }}
                                            />
                                        </FormControl>
                                        <FormDescription>Optional: skip execution if delayed longer than this.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <NodeDialogEntityFooter />
                        </form>
                    </Form>
                    </div>

                    <ExecutionOutputPanel
                        executionStatus={executionStatus}
                        executionOutput=""
                        executionError={undefined}
                        idleMessage="Save settings here, then call your cron endpoint to process due schedules."
                        className="max-h-[420px] overflow-hidden"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
};
