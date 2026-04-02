import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { forwardRef, type ComponentProps } from "react";

export const TEMPLATE_TOKEN_REGEX = /(\{\{[\s\S]*?\}\})/g;

export const splitTemplateSegments = (value: string) => {
  return value.split(TEMPLATE_TOKEN_REGEX);
};

export const isTemplateSegment = (segment: string) => {
  return /^\{\{[\s\S]*\}\}$/.test(segment);
};

type TemplateHighlightInputProps = Omit<ComponentProps<"input">, "value"> & { value?: string };

export const TemplateHighlightInput = forwardRef<HTMLInputElement, TemplateHighlightInputProps>(
  ({ value, className, placeholder, ...props }, ref) => {
    const source = value ?? "";
    const segments = splitTemplateSegments(source);

    return (
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 flex items-center overflow-hidden px-3 text-sm"
        >
          {source.length > 0 ? (
            <span className="w-full truncate whitespace-pre">
              {segments.map((segment, index) => {
                return (
                  <span
                    key={`${segment}-${index}`}
                    className={
                      isTemplateSegment(segment)
                        ? "text-sky-500 dark:text-sky-400"
                        : "text-foreground"
                    }
                  >
                    {segment}
                  </span>
                );
              })}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        <Input
          {...props}
          ref={ref}
          value={source}
          placeholder={placeholder}
          className={cn(
            "relative z-10 bg-transparent text-transparent caret-foreground placeholder:text-transparent",
            className
          )}
        />
      </div>
    );
  }
);

TemplateHighlightInput.displayName = "TemplateHighlightInput";

