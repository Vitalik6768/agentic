import { type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type NodeStatus = "loading" | "success" | "error" | "initial";

export type NodeStatusVariant = "overlay" | "border";

export type NodeStatusIndicatorProps = {
  status?: NodeStatus;
  variant?: NodeStatusVariant;
  children: ReactNode;
  className?: string;
};

export const SpinnerLoadingIndicator = ({
  children,
}: {
  children: ReactNode;
}) => {
  return (
    <div className="relative">
      <StatusBorder className="border-blue-700/40">{children}</StatusBorder>

      <div className="bg-background/50 absolute inset-0 z-50 rounded-sm backdrop-blur-xs" />
      <div className="absolute inset-0 z-50">
        <span className="absolute top-[calc(50%-1.25rem)] left-[calc(50%-1.25rem)] inline-block h-10 w-10 animate-ping rounded-full bg-blue-700/20" />

        <LoaderCircle className="absolute top-[calc(50%-0.75rem)] left-[calc(50%-0.75rem)] size-6 animate-spin text-blue-700" />
      </div>
    </div>
  );
};

export const BorderLoadingIndicator = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 z-10">
        <div className={cn("absolute inset-0 overflow-hidden rounded-sm", className)}>
          <div className="absolute top-1/2 left-1/2 aspect-square w-[140%] -translate-x-1/2 -translate-y-1/2 animate-[spin_2s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg_at_50%_50%,rgb(42,67,233)_0deg,rgba(42,138,246,0)_360deg)]" />
        </div>
      </div>
      {children}
    </div>
  );
};

const StatusBorder = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div className="relative">
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-10 rounded-sm border",
          className,
        )}
      />
      {children}
    </div>
  );
};

export const NodeStatusIndicator = ({
  status,
  variant = "border",
  children,
  className,
}: NodeStatusIndicatorProps) => {
  switch (status) {
    case "loading":
      switch (variant) {
        case "overlay":
          return <SpinnerLoadingIndicator>{children}</SpinnerLoadingIndicator>;
        case "border":
          return <BorderLoadingIndicator className={className}>{children}</BorderLoadingIndicator>;
        default:
          return <>{children}</>;
      }
    case "success":
      return (
        <StatusBorder className={cn("border-green-600", className)}>{children}</StatusBorder>
      );
    case "error":
      return <StatusBorder className={cn("border-red-700/50", className)}>{children}</StatusBorder>;
    default:
      return <>{children}</>;
  }
};