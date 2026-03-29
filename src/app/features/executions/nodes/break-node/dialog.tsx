"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import z from "zod";

export type LoopNodeOption = { id: string; label: string };

const formSchema = z.object({
  loopNodeId: z.string().min(1, { message: "Select the loop this break belongs to" }),
});

export type BreakNodeFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BreakNodeFormValues) => void;
  defaultValues?: Partial<BreakNodeFormValues>;
  loopNodes: LoopNodeOption[];
}

export const BreakNodeDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  loopNodes,
}: Props) => {
  const form = useForm<BreakNodeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      loopNodeId: defaultValues.loopNodeId ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        loopNodeId: defaultValues.loopNodeId ?? "",
      });
    }
  }, [defaultValues, open, form]);

  const handleSubmit = (values: BreakNodeFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Break node</DialogTitle>
          <DialogDescription>
            Downstream nodes run only after the last iteration of the selected loop. Place this node on
            the path that leaves the loop body.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
            <FormField
              control={form.control}
              name="loopNodeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loop</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a loop node" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loopNodes.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          Add a Loop node to the workflow first.
                        </div>
                      ) : (
                        loopNodes.map((n) => (
                          <SelectItem key={n.id} value={n.id}>
                            {n.label}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Must match the loop whose body you are exiting; iteration data stays in context until
                    the final pass.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="mt-4">
              <Button className="w-full" type="submit" disabled={loopNodes.length === 0}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
