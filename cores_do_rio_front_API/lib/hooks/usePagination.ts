"use client";
import { useState, useMemo, useEffect } from "react";
import { useWindowSize } from "./useWindowSize";

export function getPageSize(width: number): number {
  if (width < 480) return 5;
  if (width < 640) return 6;
  if (width < 1024) return 8;
  return 10;
}

export function usePagination<T>(items: T[]) {
  const { width }  = useWindowSize();
  const pageSize   = getPageSize(width);
  const [page, setPage] = useState(0);
  const [dir,  setDir]  = useState<"next" | "prev">("next");

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Clamp page when pageSize or items change
  useEffect(() => {
    setPage(p => Math.min(p, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  const pageItems = useMemo(
    () => items.slice(page * pageSize, (page + 1) * pageSize),
    [items, page, pageSize]
  );

  const goNext = () => {
    if (page < totalPages - 1) { setDir("next"); setPage(p => p + 1); }
  };
  const goPrev = () => {
    if (page > 0) { setDir("prev"); setPage(p => p - 1); }
  };

  const from = items.length === 0 ? 0 : page * pageSize + 1;
  const to   = Math.min((page + 1) * pageSize, items.length);

  return {
    pageItems,
    page,
    totalPages,
    pageSize,
    dir,
    total: items.length,
    from,
    to,
    goNext,
    goPrev,
    resetPage: () => setPage(0),
    animKey:   `${page}-${pageSize}`,
    animClass: dir === "next" ? "cr-list-next" : "cr-list-prev",
  };
}
