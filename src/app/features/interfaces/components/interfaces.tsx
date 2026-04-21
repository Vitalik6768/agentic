"use client";

import { EmptyView, EntityContainer, ErrorView, LoadingView } from "@/components/entity-components";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { InterfaceType } from "generated/prisma";
import { Clock3Icon, FileTextIcon, MessageSquareIcon, PlusIcon, Table2Icon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { INTERFACE_TYPES, useCreateInterface, useRemoveInterface, useSuspenseInterfaces } from "../hooks/use-interfaces";

type InterfaceItem = {
  id: string;
  name: string;
  type: InterfaceType;
  updatedAt: Date;
};

const getInterfaceHref = (item: InterfaceItem) => {
  if (item.type === InterfaceType.TEXT) {
    return `/interfaces/text-interface/${item.id}`;
  }
  if (item.type === InterfaceType.TABLE) {
    return `/interfaces/table-interface/${item.id}`;
  }
  if (item.type === InterfaceType.CHAT) {
    return `/interfaces/chat-interface/${item.id}`;
  }

  return "/interfaces";
};

const getInterfaceMeta = (type: InterfaceType) => {
  if (type === InterfaceType.TABLE) {
    return {
      label: "Table Interface",
      Icon: Table2Icon,
      iconClassName: "text-emerald-600",
      cardClassName: "border-l-4 border-l-emerald-500 border-b-2 border-b-emerald-500/50 border-t-2 border-t-emerald-500/50 border-r-2 border-r-emerald-500/50",
      badgeClassName: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    };
  }

  if (type === InterfaceType.CHAT) {
    return {
      label: "Chat Interface",
      Icon: MessageSquareIcon,
      iconClassName: "text-violet-600",
      cardClassName:
        "border-l-4 border-l-violet-500 border-b-2 border-b-violet-500/50 border-t-2 border-t-violet-500/50 border-r-2 border-r-violet-500/50",
      badgeClassName: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
    };
  }

  return {
    label: "Text Interface",
    Icon: FileTextIcon,
    iconClassName: "text-blue-600",
    cardClassName: "border-l-4 border-l-blue-500 border-b-2 border-b-blue-500/50 border-t-2 border-t-blue-500/50 border-r-2 border-r-blue-500/50",
    badgeClassName: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  };
};

export const InterfacesList = () => {
  const interfaces = useSuspenseInterfaces();
  const items = interfaces.data.items as InterfaceItem[];

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <div className="mx-auto max-w-sm">
          <EmptyView message="No interfaces yet. Create your first interface to get started." />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <InterfaceCard key={item.id} item={item} />
      ))}
    </div>
  );
};

const InterfaceCard = ({ item }: { item: InterfaceItem }) => {
  const removeInterface = useRemoveInterface();
  const href = useMemo(() => getInterfaceHref(item), [item]);
  const typeMeta = useMemo(() => getInterfaceMeta(item.type), [item.type]);

  const handleDelete = async () => {
    await removeInterface.mutateAsync({ id: item.id });
  };

  return (
    <Link href={href} prefetch className="group block h-full">
      <Card
        className={cn(
          "h-full cursor-pointer border border-border/80 bg-muted/10 shadow-none group-hover:border-primary/60 group-hover:shadow-md",
          typeMeta.cardClassName,
          removeInterface.isPending && "opacity-60",
        )}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-background ring-1 ring-muted-foreground/10">
              <typeMeta.Icon className={cn("size-4", typeMeta.iconClassName)} />
            </div>
            <div className="min-w-0 space-y-2">
              <CardTitle className="truncate text-base font-semibold">{item.name}</CardTitle>
              <CardDescription>
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", typeMeta.badgeClassName)}>
                  {typeMeta.label}
                </span>
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void handleDelete();
            }}
            disabled={removeInterface.isPending}
          >
            <Trash2Icon className="size-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex items-center gap-1.5 pt-0 text-xs text-muted-foreground">
          <Clock3Icon className="size-3.5" />
          <span>Updated {formatDistanceToNow(item.updatedAt, { addSuffix: true })}</span>
        </CardContent>
      </Card>
    </Link>
  );
};

export const InterfacesHeader = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<InterfaceType>(InterfaceType.TEXT);
  const createInterface = useCreateInterface();
  const selectedTypeMeta = useMemo(() => getInterfaceMeta(type), [type]);

  const handleCreate = () => {
    createInterface.mutate(
      {
        name: name.trim() || undefined,
        type,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setName("");
          setType(InterfaceType.TEXT);
        },
      },
    );
  };

  return (
    <>
      <div className="flex flex-row items-center justify-between gap-x-4">
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold md:text-xl">Interfaces</h1>
          <p className="text-xs text-muted-foreground md:text-sm">Manage your created interfaces</p>
        </div>
        <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700 rounded-xs hover:cursor-pointer hover:border-blue-800 shadow-sm" onClick={() => setOpen(true)}>
          <PlusIcon className="size-4" />
          New Interface
        </Button>
      </div>


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <PlusIcon className="size-4" />
              </span>
              Create Interface
            </DialogTitle>
            <DialogDescription className="text-sm">
              Select interface type and optionally provide a name.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
              <p className="text-sm font-medium">Type</p>
              <Select value={type} onValueChange={(value) => setType(value as InterfaceType)}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue>
                    <span className="inline-flex items-center gap-2">
                      <selectedTypeMeta.Icon className={cn("size-4", selectedTypeMeta.iconClassName)} />
                      <span>{selectedTypeMeta.label}</span>
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {INTERFACE_TYPES.map((item) => {
                    const itemMeta = getInterfaceMeta(item.value as InterfaceType);
                    return (
                      <SelectItem key={item.value} value={item.value}>
                        <span className="inline-flex items-center gap-2">
                          <itemMeta.Icon className={cn("size-4", itemMeta.iconClassName)} />
                          <span>{item.label}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
              <p className="text-sm font-medium">Name (optional)</p>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="marketing-landing-page"
                className="bg-background"
              />
            </div>
          </div>

          <DialogFooter className="rounded-lg border bg-muted/20 p-3 sm:justify-between">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createInterface.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const InterfacesContainer = ({ children }: { children: React.ReactNode }) => {
  return <EntityContainer header={<InterfacesHeader />}>{children}</EntityContainer>;
};

export const InterfacesLoading = () => {
  return <LoadingView entity="interfaces" message="Loading interfaces..." />;
};

export const InterfacesError = () => {
  return <ErrorView entity="interfaces" message="Error loading interfaces..." />;
};

export const InterfacesEmpty = () => {
  return (
    <div className="mx-auto flex max-w-sm justify-center">
      <EmptyView message="No interfaces yet. Create your first interface to get started." />
    </div>
  );
};

