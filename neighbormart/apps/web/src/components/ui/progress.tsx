import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/utils/cn";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    showLabel?: boolean;
  }
>(({ className, value, showLabel, ...props }, ref) => {
  const pct = Math.min(Math.max(value ?? 0, 0), 100);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {showLabel && (
        <div className="flex justify-between items-center">
          <span className="text-xs text-[var(--muted-foreground)]">Progress</span>
          <span className="text-xs font-semibold text-[var(--foreground)]">{pct}%</span>
        </div>
      )}
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          "relative h-2.5 w-full overflow-hidden rounded-full bg-[var(--muted)]",
          className
        )}
        value={pct}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className="h-full w-full flex-1 bg-[#1B4332] dark:bg-green-500 transition-all duration-500 ease-in-out rounded-full origin-left"
          style={{ transform: `translateX(-${100 - pct}%)` }}
        />
      </ProgressPrimitive.Root>
    </div>
  );
});

Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
