import { useEffect, useMemo, useState } from "react";

export function usePagination<T>(items: T[], pageSize = 8, resetKey?: string) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage(0);
  }, [resetKey, pageSize, items.length]);

  useEffect(() => {
    if (page > pages - 1) setPage(Math.max(0, pages - 1));
  }, [page, pages]);

  const pageItems = useMemo(
    () => items.slice(page * pageSize, page * pageSize + pageSize),
    [items, page, pageSize],
  );

  const rangeStart = items.length ? page * pageSize + 1 : 0;
  const rangeEnd = Math.min(items.length, page * pageSize + pageSize);

  return {
    page,
    setPage,
    pages,
    pageSize,
    pageItems,
    rangeStart,
    rangeEnd,
    total: items.length,
  };
}
