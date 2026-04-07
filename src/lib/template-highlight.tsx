import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  forwardRef,
  type ComponentProps,
  type ReactNode,
  type UIEvent,
  useCallback,
  useRef,
} from "react";

/** Captures full `{{ ... }}` template tokens (non-greedy). Handlebars allows newlines inside `{{ }}`. */
const TEMPLATE_TOKEN_RE = /(\{\{[\s\S]*?\}\})/g;

function splitTemplateSegments(value: string): string[] {
  return value.split(TEMPLATE_TOKEN_RE);
}

function isTemplateToken(segment: string): boolean {
  return /^\{\{[\s\S]*\}\}$/.test(segment);
}

/**
 * If `value` is exactly a single `{{ ... }}` token, returns the inner expression (trimmed).
 * Otherwise returns null.
 */
export function unwrapTemplateToken(value: string): string | null {
  const match = /^\{\{\s*([\s\S]*?)\s*\}\}$/.exec(value);
  return match?.[1]?.trim() ? match[1].trim() : null;
}

const tokenClass = "text-sky-600 dark:text-sky-400";
const plainClass = "text-foreground";

function HighlightedTemplateSegments({ source }: { source: string }): ReactNode {
  const segments = splitTemplateSegments(source);
  return (
    <>
      {segments.map((segment, index) => (
        <span key={`${index}-${segment.length}`} className={isTemplateToken(segment) ? tokenClass : plainClass}>
          {segment}
        </span>
      ))}
    </>
  );
}

export type TemplateVariableInputProps = Omit<ComponentProps<typeof Input>, "value"> & {
  value?: string;
};

/**
 * Single-line input that tints `{{ ... }}` template tokens (sky) while you type.
 * Uses a stacked mirror layer; the input text is transparent so the caret stays visible.
 */
export const TemplateVariableInput = forwardRef<HTMLInputElement, TemplateVariableInputProps>(
  ({ className, value, placeholder, ...props }, ref) => {
    const source = value ?? "";

    return (
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 flex items-center overflow-hidden px-3 py-1 text-base md:text-sm"
        >
          {source.length > 0 ? (
            <span className="w-full truncate whitespace-pre">
              <HighlightedTemplateSegments source={source} />
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

TemplateVariableInput.displayName = "TemplateVariableInput";

export type TemplateVariableTextareaProps = Omit<ComponentProps<typeof Textarea>, "value"> & {
  value?: string;
};

/**
 * Multi-line textarea with the same `{{ ... }}` highlighting. Scroll position is kept in sync with the mirror layer.
 */
export const TemplateVariableTextarea = forwardRef<HTMLTextAreaElement, TemplateVariableTextareaProps>(
  ({ className, value, placeholder, onScroll, ...props }, ref) => {
    const source = value ?? "";
    const highlightRef = useRef<HTMLDivElement>(null);

    const handleScroll = useCallback(
      (event: UIEvent<HTMLTextAreaElement>) => {
        const el = highlightRef.current;
        if (el) {
          el.scrollTop = event.currentTarget.scrollTop;
          el.scrollLeft = event.currentTarget.scrollLeft;
        }
        onScroll?.(event);
      },
      [onScroll]
    );

    return (
      <div className="relative">
        <div
          ref={highlightRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 overflow-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div
            className={cn(
              "min-h-full whitespace-pre-wrap wrap-break-word px-3 py-2 text-base md:text-sm",
              className
            )}
          >
            {source.length > 0 ? (
              <HighlightedTemplateSegments source={source} />
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
        </div>
        <Textarea
          {...props}
          ref={ref}
          value={source}
          placeholder={placeholder}
          onScroll={handleScroll}
          className={cn(
            "relative z-10 bg-transparent text-transparent caret-foreground placeholder:text-transparent [scrollbar-gutter:stable]",
            className
          )}
        />
      </div>
    );
  }
);

TemplateVariableTextarea.displayName = "TemplateVariableTextarea";
