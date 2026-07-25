import * as React from "react";
import { Button } from "./button";
import { cn } from "@/utils/cn";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "ghost" | "secondary";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        "py-16 px-6 w-full",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {icon && (
        <div
          className={cn(
            "mb-5 flex items-center justify-center",
            "h-20 w-20 rounded-2xl",
            "bg-[#1B4332]/8 dark:bg-[#1B4332]/20",
            "text-[#1B4332] dark:text-green-400",
            "border border-[#1B4332]/15 dark:border-green-800/40"
          )}
          aria-hidden="true"
        >
          <span className="[&>svg]:h-9 [&>svg]:w-9">{icon}</span>
        </div>
      )}

      <h3 className="text-base font-semibold text-[var(--foreground)] leading-tight">
        {title}
      </h3>

      {description && (
        <p className="mt-2 text-sm text-[var(--muted-foreground)] max-w-sm leading-relaxed">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action && (
            <Button
              variant={action.variant ?? "default"}
              size="md"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" size="md" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export { EmptyState };
