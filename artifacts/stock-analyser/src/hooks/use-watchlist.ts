import { useState, useCallback } from "react";

const STORAGE_KEY = "stock-watchlist";

function readStorage(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>(readStorage);

  const toggle = useCallback((ticker: string) => {
    setWatchlist((prev) => {
      const next = prev.includes(ticker)
        ? prev.filter((t) => t !== ticker)
        : [...prev, ticker];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isInWatchlist = useCallback(
    (ticker: string) => watchlist.includes(ticker),
    [watchlist]
  );

  return { watchlist, toggle, isInWatchlist };
}
