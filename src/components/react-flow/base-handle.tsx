import type { ComponentProps } from "react";
import { Handle, type HandleProps } from "@xyflow/react";

import { cn } from "@/lib/utils";

export type BaseHandleProps = HandleProps;

export function BaseHandle({
  className,
  children,
  ...props
}: ComponentProps<typeof Handle>) {
  return (
    <Handle
      {...props}
      className={cn(
        "dark:border-secondary dark:bg-secondary z-20 h-[8px]! w-[8px]! rounded-full border border-gray-500! bg-gray-300! transition",
        className,
      )}
    >
      {children}
    </Handle>
  );
}
