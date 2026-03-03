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
import { InterfaceType } from "generated/prisma";
import { PlusIcon, Trash2Icon } from "lucide-react";
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

  return "/interfaces";
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

  const handleDelete = async () => {
    await removeInterface.mutateAsync({ id: item.id });
  };

  return (
    <Link href={href} prefetch>
      <Card className={cn("h-full cursor-pointer shadow-none transition hover:shadow-sm", removeInterface.isPending && "opacity-60")}>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">{item.name}</CardTitle>
            <CardDescription>{item.type}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
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
        <CardContent className="pt-0 text-xs text-muted-foreground">
          Updated {new Date(item.updatedAt).toLocaleString()}
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
        <Button size="sm" onClick={() => setOpen(true)}>
          <PlusIcon className="size-4" />
          New Interface
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Interface</DialogTitle>
            <DialogDescription>Select interface type and optionally provide a name.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Type</p>
              <Select value={type} onValueChange={(value) => setType(value as InterfaceType)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select interface type" />
                </SelectTrigger>
                <SelectContent>
                  {INTERFACE_TYPES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Name (optional)</p>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="marketing-landing-page"
              />
            </div>
          </div>

          <DialogFooter>
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

