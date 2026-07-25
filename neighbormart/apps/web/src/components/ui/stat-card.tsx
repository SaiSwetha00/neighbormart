"use client";

import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { cn } from "@/utils/cn";
import { Skeleton } from "./skeleton";

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  sparklineData?: number[];
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  prefix?: string;
  suffix?: string;
}

const TrendIcon = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
} as const;

function StatCard({
  title,
  value,
  change,
  trend = "neutral",
  icon,
  sparklineData,
  loading = false,
  onClick,
  className,
  prefix = "",
  suffix = "",
}: StatCardProps) {
  const hasChange = change !== undefined;
  const absChange = hasChange ? Math.abs(change) : 0;
  const TIcon = TrendIcon[trend];

  const trendColors = {
    up: "text-green-600 dark:text-green-400",
    down: "text-red-500 dark:text-red-400",
    neutral: "text-[var(--muted-foreground)]",
  };

  const sparkLineColor = {
    up: "#16a34a",
    down: "#ef4444",
    neutral: "#6b7280",
  };

  const chartData = sparklineData?.map((v, i) => ({ i, v })) ?? [];

  if (loading) {
    return (
      <div
        className={cn(
          "rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 flex flex-col gap-3",
          className
        )}
      >
        <div className="flex items-start justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-24" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-10 w-full rounded" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)]",
        "p-5 flex flex-col gap-2 shadow-sm transition-shadow duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:border-[#1B4332]/30",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[var(--muted-foreground)] leading-tight">{title}</p>
        {icon && (
          <div
            className={cn(
              "flex items-center justify-center h-10 w-10 rounded-lg shrink-0",
              "bg-[#1B4332] text-white dark:bg-[#1B4332]",
              "[&>svg]:h-5 [&>svg]:w-5"
            )}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <p className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
        {prefix}
        {typeof value === "number" ? value.toLocaleString() : value}
        {suffix}
      </p>

      {/* Trend */}
      {hasChange && (
        <div className={cn("flex items-center gap-1 text-xs font-medium", trendColors[trend])}>
          <TIcon size={13} strokeWidth={2.5} />
          <span>
            {absChange.toFixed(1)}%{" "}
            <span className="font-normal text-[var(--muted-foreground)]">vs last period</span>
          </span>
        </div>
      )}

      {/* Sparkline */}
      {chartData.length > 1 && (
        <div className="h-10 w-full mt-1" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={sparkLineColor[trend]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <RechartsTooltip
                contentStyle={{ display: "none" }}
                cursor={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export { StatCard };
