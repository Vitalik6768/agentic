"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
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
    const form = useForm<ScheduleTriggerFormValues>({
        resolver: zodResolver(formSchema),
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
            form.reset({
                cronExpression: defaultValues.cronExpression ?? "*/5 * * * *",
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Schedule Trigger</DialogTitle>
                    <DialogDescription>
                        Configure when this workflow should run automatically.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 md:grid-cols-2">
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

                            <DialogFooter>
                                <Button className="w-full" type="submit">Save</Button>
                            </DialogFooter>
                        </form>
                    </Form>

                    <div className="rounded-md border bg-muted/30 p-4">
                        <h3 className="mb-2 text-sm font-semibold">Status</h3>
                        <p className="text-xs text-muted-foreground">
                            {executionStatus === "loading"
                                ? "Running..."
                                : executionStatus === "success"
                                  ? "Completed"
                                  : executionStatus === "error"
                                    ? "Failed"
                                    : "Idle"}
                        </p>
                        <div className="mt-4 rounded-md border border-dashed bg-background p-3 text-sm text-muted-foreground">
                            Save settings here, then call your cron endpoint to process due schedules.
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
