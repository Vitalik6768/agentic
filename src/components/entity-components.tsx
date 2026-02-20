import { AlertTriangleIcon, Loader2Icon, MoreHorizontalIcon, PackageOpenIcon, PlusIcon, SearchIcon, TrashIcon } from "lucide-react";
import { Button } from "./ui/button";
import Link from "next/link";
import { Input } from "./ui/input";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardTitle } from "./ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

type EntityHeaderProps = {
    title: string;
    description?: string;
    newButtonLabel?: string;
    disabled?: boolean;
    isCreating?: boolean;

} & (
        | { onNew: () => void; newButtonHref?: never; }
        | { newButtonHref: string; onNew?: never; }
        | { onNew?: never; newButtonHref?: never; }

    )



export const EntityHeader = ({
    title,
    description,
    onNew,
    newButtonHref,
    newButtonLabel,
    disabled,
    isCreating,
}: EntityHeaderProps) => {
    return (
        <div className="flex flex-row items-center justify-between gap-x-4">
            <div className="flex flex-col">
                <h1 className="text-lg md:text-xl font-semibold">{title}</h1>
                {description && <p className="text-xs md:text-sm text-muted-foreground">{description}</p>}

            </div>
            {onNew && !newButtonHref && (
                <Button
                    disabled={isCreating ?? disabled}
                    size="sm"
                    onClick={onNew}>
                    <PlusIcon className="size-4" />
                    {newButtonLabel}

                </Button>
            )}
            {newButtonHref && !onNew && (
                <Button size="sm" asChild>
                    <Link href={newButtonHref} prefetch>
                        <PlusIcon className="size-4" />
                        {newButtonLabel}
                    </Link>
                </Button>

            )}
        </div>
    )
}

type EntityContainerProps = {
    children: React.ReactNode;
    header?: React.ReactNode;
    search?: React.ReactNode;
    pagination?: React.ReactNode;
}



export const EntityContainer = ({ children, header, search, pagination }: EntityContainerProps) => {
    return (
        <div className="p-4 md:px-10 md:py-6 h-full">
            <div className="mx-auto max-w-7xl w-full flex flex-col gap-y-8 h-full">
                {header}

                <div className="flex flex-col gap-y-4 h-full">
                    {search}
                    {children}
                    {pagination}

                </div>

            </div>
        </div>
    )
}

interface EntitySearch {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export const EntitySearch = ({ value, onChange, placeholder }: EntitySearch) => {
    return (
        <div className="relative ml-auto">
            <SearchIcon className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="max-w-[200px] bg-background shadow-none border-border pl-8"

            />
        </div>
    )
}


interface EntityPaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    disabled?: boolean;
}
export const EntityPagination = ({ page, totalPages, onPageChange }: EntityPaginationProps) => {
    return (
        <div className="flex items-center justify-between gap-x-2 w-full">
            <div className="flex-1 text-sm text-muted-foreground">
                Page {page} of {totalPages || 1}
            </div>

            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    disabled={page === 1}
                    variant="outline"
                    size="sm"
                    onClick={() => { onPageChange(Math.max(1, page - 1)) }}
                >
                    previous
                </Button>

                <Button
                    disabled={page === totalPages || totalPages === 0}
                    variant="outline"
                    size="sm"
                    onClick={() => { onPageChange(Math.min(totalPages || 1, page + 1)) }}
                >
                    next
                </Button>

            </div>

        </div>
    )
}

interface StateViewProps {
    message?: string;

}

interface loadingViewProps extends StateViewProps {
    entity?: string;

}

export const LoadingView = ({ message, entity = 'items' }: loadingViewProps) => {
    return (
        <div className="flex justify-center items-center h-full flex-1 flex-col gap-y-4">
            <Loader2Icon className="size-6 animate-spin text-primary" />
            <p className="text-sm text-primary">{message ?? `Loading ${entity}...`}</p>

        </div>
    )
}

interface ErrorViewProps extends StateViewProps {
    entity?: string;

}

export const ErrorView = ({ message, entity = 'items' }: ErrorViewProps) => {
    return (
        <div className="flex justify-center items-center h-full flex-1 flex-col gap-y-4">
            <AlertTriangleIcon className="size-6 text-primary" />
            <p className="text-sm text-primary">{message ?? `Loading ${entity}...`}</p>

        </div>
    )
}

interface EmptyViewProps extends StateViewProps {
    onNew?: () => void;

}

export const EmptyView = ({ message, onNew }: EmptyViewProps) => {
    return (
        <Empty className="border border-dashed bg-white">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <PackageOpenIcon className="size-4" />

                </EmptyMedia>
            </EmptyHeader>
            <EmptyTitle>
                No Items
            </EmptyTitle>
            {message && (
                <EmptyDescription>
                    {message}
                </EmptyDescription>
            )}
            {onNew && (
                <EmptyContent>
                    <Button onClick={onNew}>Add Item</Button>
                </EmptyContent>

            )}

        </Empty>

    )
}


interface entityListProps<T> {
    items: T[];
    renderItem: (item: T, index: number) => React.ReactNode;
    getKey: (item: T, index: number) => string | number;
    emptyView?: React.ReactNode;
    className?: string;
}

export const EntityList = <T,>({ items, renderItem, emptyView, className }: entityListProps<T>) => {
    if (items.length === 0 && emptyView) {
        return <div className="flex justify-center items-center h-full flex-1 flex-col gap-y-4">
            <div className="max-w-sm mx-auto">
                {emptyView}
            </div>

        </div>
    }

    return (
        <div className={cn("flex flex-col gap-y-4", className)}>
            {items.map((item, index) => (
                // <div key={getKey ? (getKey(item, index)) : (index)}>
                <div key={index}>

                    {renderItem(item, index)}
                </div>
            ))}
        </div>
    )
}

interface entityItemProps {
    href: string;
    title: string;
    subtitle?: React.ReactNode;
    image?: React.ReactNode;
    actions?: React.ReactNode;
    onRemove?: () => void;
    className?: string;
    isRemoving?: boolean;
}

export const EntityItem = ({ href, title, subtitle, image, actions, onRemove, className, isRemoving }: entityItemProps) => {
    const handleRemove = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isRemoving) {
            return;
        }
        if (onRemove) {
             onRemove();
        }

    }
    return (
        <Link href={href} prefetch>
            <Card className={cn("p-4 shadow-none hover:shadow cursor-pointer", isRemoving && "opacity-50 cursor-not-allowed", className)}>
                <CardContent className="flex flex-row justify-between p-0">
                    <div className="flex items-center gap-3">
                        {image}
                        <div>
                            <CardTitle className="text-base font-medium">
                                {title}
                            </CardTitle>

                            {!!subtitle && (
                                <CardDescription className="text-xs">
                                    {subtitle}
                                </CardDescription>
                            )}
                        </div>
                    </div>
                    {(actions ?? onRemove) && (
                        <div className="flex gap-x-4 items-center">
                            {actions}
                            {onRemove && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <MoreHorizontalIcon className="size-4" />
                                        </Button>

                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        align="end"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <DropdownMenuItem onClick={handleRemove}>
                                            <TrashIcon className="size-4" />
                                            Delete
                                        </DropdownMenuItem>

                                    </DropdownMenuContent>

                                </DropdownMenu>

                            )}
                        </div>
                    )}
                </CardContent>

            </Card>

        </Link>

    )
}