import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useResourceList<T>(table: string, orderBy = "sort_order") {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from(table)
      .select("*")
      .order(orderBy);
    if (err) {
      setError(err.message);
      setRows([]);
    } else {
      setRows((data as T[]) ?? []);
    }
    setLoading(false);
  }, [table, orderBy]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { rows, loading, error, reload, setRows };
}
