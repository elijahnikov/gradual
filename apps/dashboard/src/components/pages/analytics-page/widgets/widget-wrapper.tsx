import { cn } from "@gradual/ui";
import { Skeleton } from "@gradual/ui/skeleton";
import { Text } from "@gradual/ui/text";
import { Component, type ErrorInfo, type ReactNode, Suspense } from "react";

type WidgetVariant = "kpi" | "chart" | "canvas" | "bar" | "table";

interface WidgetWrapperProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: ReactNode;
  className?: string;
  variant?: WidgetVariant;
}

function KpiSkeleton() {
  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <Skeleton className="h-9 w-28" />
      <Skeleton className="h-4 w-36" />
    </div>
  );
}

function ChartSkeleton() {
  return <Skeleton className="h-full w-full rounded-md" />;
}

function WidgetSkeleton({ variant = "chart" }: { variant?: WidgetVariant }) {
  switch (variant) {
    case "kpi":
      return <KpiSkeleton />;
    default:
      return <ChartSkeleton />;
  }
}

interface ErrorBoundaryState {
  error: Error | null;
}

class WidgetErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Widget error:", error, info);
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="flex h-full items-center justify-center p-4">
          <Text className="text-ui-fg-muted" size="small">
            Failed to load: {this.state.error.message}
          </Text>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function WidgetWrapper({
  title,
  description,
  icon: Icon,
  children,
  className,
  variant = "chart",
}: WidgetWrapperProps) {
  return (
    <div className={cn("flex h-full flex-col overflow-hidden", className)}>
      <div className="flex items-center gap-2.5 border-b bg-ui-bg-subtle px-4 py-3">
        {Icon && <Icon className="size-4 shrink-0 text-ui-fg-muted" />}
        <Text size="small" weight="plus">
          {title}
        </Text>
        {description ? (
          <Text className="font-mono text-ui-fg-muted" size="xsmall">
            {description}
          </Text>
        ) : null}
      </div>
      <div
        className={cn(
          "min-h-0 flex-1",
          variant === "chart" && "flex items-center px-3 py-3",
          variant === "canvas" && "pt-2",
          variant !== "chart" && variant !== "canvas" && "pt-2"
        )}
      >
        <WidgetErrorBoundary>
          <Suspense
            fallback={
              <div className="h-full w-full px-2 pb-2">
                <WidgetSkeleton variant={variant} />
              </div>
            }
          >
            {variant === "canvas" ? (
              children
            ) : (
              <div className={cn(variant === "table" && "p-0", "h-full px-2")}>
                {children}
              </div>
            )}
          </Suspense>
        </WidgetErrorBoundary>
      </div>
    </div>
  );
}
