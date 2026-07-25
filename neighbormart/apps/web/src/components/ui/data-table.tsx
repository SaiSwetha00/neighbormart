"use client";

import * as React from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "./button";
import { Input } from "./input";
import { Checkbox } from "./checkbox";
import { SkeletonTable } from "./skeleton";
import { EmptyState } from "./empty-state";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

export interface BulkAction<T> {
  label: string;
  onClick: (selectedRows: T[]) => void;
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost";
}

export interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  searchPlaceholder?: string;
  onBulkAction?: (selected: T[]) => void;
  bulkActions?: BulkAction<T>[];
  onExport?: (data: T[]) => void;
  rowKey?: keyof T | ((row: T) => string);
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
  className?: string;
}

type SortDirection = "asc" | "desc" | null;

// ── Helpers ────────────────────────────────────────────────────────────────────

function getNestedValue(obj: Record<string, unknown>, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

function exportToCSV<T extends Record<string, unknown>>(
  columns: Column<T>[],
  data: T[],
  filename = "export.csv"
) {
  const headers = columns.map((c) => `"${c.header}"`).join(",");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const raw = getNestedValue(row, String(col.key));
        const str = raw == null ? "" : String(raw);
        return `"${str.replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  const csv = [headers, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function SortIcon({ direction }: { direction: SortDirection }) {
  if (direction === "asc") return <ChevronUp size={13} className="shrink-0" />;
  if (direction === "desc") return <ChevronDown size={13} className="shrink-0" />;
  return <ChevronsUpDown size={13} className="shrink-0 opacity-40" />;
}

// ── Component ──────────────────────────────────────────────────────────────────

function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  searchPlaceholder = "Search…",
  bulkActions = [],
  onExport,
  rowKey,
  emptyTitle = "No results found",
  emptyDescription = "Try adjusting your search or filters.",
  pageSize = 25,
  className,
}: DataTableProps<T>) {
  const [search, setSearch] = React.useState("");
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDirection>(null);
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  // ── Derive row ID ────────────────────────────────────────────────────────────
  const getRowId = React.useCallback(
    (row: T, index: number): string => {
      if (typeof rowKey === "function") return rowKey(row);
      if (rowKey) return String(row[rowKey] ?? index);
      return String(index);
    },
    [rowKey]
  );

  // ── Filtering ────────────────────────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = getNestedValue(row, String(col.key));
        return String(val ?? "").toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  // ── Sorting ──────────────────────────────────────────────────────────────────
  const sorted = React.useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const av = getNestedValue(a, sortKey);
      const bv = getNestedValue(b, sortKey);
      const aStr = String(av ?? "");
      const bStr = String(bv ?? "");
      const aNum = parseFloat(aStr);
      const bNum = parseFloat(bStr);
      const compareVal =
        !isNaN(aNum) && !isNaN(bNum) ? aNum - bNum : aStr.localeCompare(bStr);
      return sortDir === "asc" ? compareVal : -compareVal;
    });
  }, [filtered, sortKey, sortDir]);

  // ── Pagination ───────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageData = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  React.useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search, sortKey, sortDir]);

  // ── Selection ────────────────────────────────────────────────────────────────
  const pageIds = pageData.map((row, i) => getRowId(row, (safePage - 1) * pageSize + i));
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));

  const toggleAll = () => {
    if (allPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedRows = sorted.filter((row, i) =>
    selected.has(getRowId(row, i))
  );

  // ── Sort handler ─────────────────────────────────────────────────────────────
  const handleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortKey(null);
      setSortDir(null);
    }
  };

  // ── Pagination helpers ───────────────────────────────────────────────────────
  const pageNumbers = React.useMemo(() => {
    const pages: (number | "…")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("…");
      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
        pages.push(i);
      }
      if (safePage < totalPages - 2) pages.push("…");
      pages.push(totalPages);
    }
    return pages;
  }, [safePage, totalPages]);

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-64 rounded-lg bg-[var(--muted)] animate-pulse" />
        </div>
        <SkeletonTable rows={8} cols={columns.length + 1} />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Input
            leftIcon={<Search size={15} />}
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search table"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {selected.size > 0 && bulkActions.length > 0 && (
            <>
              <span className="text-sm text-[var(--muted-foreground)]">
                {selected.size} selected
              </span>
              {bulkActions.map((action, i) => (
                <Button
                  key={i}
                  variant={action.variant ?? "outline"}
                  size="sm"
                  onClick={() => action.onClick(selectedRows)}
                >
                  {action.label}
                </Button>
              ))}
            </>
          )}

          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport(sorted)}
            >
              <Download size={14} />
              Export CSV
            </Button>
          )}

          {!onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(columns, sorted)}
            >
              <Download size={14} />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="w-full overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full caption-bottom text-sm border-collapse">
          <thead className="bg-[var(--muted)]">
            <tr className="border-b border-[var(--border)]">
              {/* Select all */}
              <th className="h-11 w-11 px-3 align-middle">
                <Checkbox
                  checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                  onCheckedChange={toggleAll}
                  aria-label="Select all rows"
                />
              </th>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    "h-11 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] whitespace-nowrap",
                    col.sortable && "cursor-pointer select-none hover:text-[var(--foreground)] transition-colors",
                    col.headerClassName
                  )}
                  onClick={col.sortable ? () => handleSort(String(col.key)) : undefined}
                  aria-sort={
                    sortKey === String(col.key)
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : col.sortable
                      ? "none"
                      : undefined
                  }
                >
                  <span className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <SortIcon direction={sortKey === String(col.key) ? sortDir : null} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border)] bg-[var(--card)]">
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="p-0">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    className="py-12"
                  />
                </td>
              </tr>
            ) : (
              pageData.map((row, rowIndex) => {
                const globalIndex = (safePage - 1) * pageSize + rowIndex;
                const id = getRowId(row, globalIndex);
                const isSelected = selected.has(id);
                return (
                  <tr
                    key={id}
                    className={cn(
                      "transition-colors duration-150 hover:bg-[var(--muted)]/50",
                      isSelected && "bg-[#1B4332]/5 dark:bg-[#1B4332]/15"
                    )}
                    data-selected={isSelected}
                  >
                    <td className="px-3 py-3 align-middle">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRow(id)}
                        aria-label={`Select row ${globalIndex + 1}`}
                      />
                    </td>
                    {columns.map((col) => {
                      const raw = getNestedValue(row, String(col.key));
                      return (
                        <td
                          key={String(col.key)}
                          className={cn(
                            "px-4 py-3 align-middle text-sm text-[var(--foreground)]",
                            col.className
                          )}
                        >
                          {col.render
                            ? col.render(raw, row, globalIndex)
                            : raw == null
                            ? "—"
                            : String(raw)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {sorted.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-[var(--muted-foreground)]">
            Showing{" "}
            <span className="font-medium text-[var(--foreground)]">
              {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-[var(--foreground)]">{sorted.length}</span>{" "}
            results
          </p>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label="Previous page"
              className="h-8 w-8"
            >
              <ChevronLeft size={15} />
            </Button>

            {pageNumbers.map((p, i) =>
              p === "…" ? (
                <span key={`ellipsis-${i}`} className="px-1 text-[var(--muted-foreground)]">
                  …
                </span>
              ) : (
                <Button
                  key={p}
                  variant={p === safePage ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8 text-xs"
                  onClick={() => setPage(p)}
                  aria-label={`Page ${p}`}
                  aria-current={p === safePage ? "page" : undefined}
                >
                  {p}
                </Button>
              )
            )}

            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-label="Next page"
              className="h-8 w-8"
            >
              <ChevronRight size={15} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export { DataTable };
