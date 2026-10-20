import { useState, useEffect, useRef } from "react";

// ─── Cursor-paged list ────────────────────────────────────────
// Shared by the comment feed and every reply thread (each thread has its own
// instance, so threads never affect one another). Pages arrive oldest-first.
// `extra` holds items posted here while later pages are still unloaded: they
// render after "Load more" (never pretending to follow the loaded page) and
// drop out once paging reaches them.
export default function useCursorList(fetchPage) {
  const [items, setItems] = useState([]);
  const [extra, setExtra] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const cursorRef = useRef(null);
  const busyRef = useRef(false);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // One request at a time: repeated clicks are no-ops while one is in flight,
  // and the cursor only advances on success, so a failed page is retried as-is.
  const loadMore = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    setError(false);
    try {
      const page = await fetchPage(cursorRef.current);
      if (!aliveRef.current) return;
      const pageIds = new Set(page.items.map((i) => i._id));
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i._id));
        return [...prev, ...page.items.filter((i) => !seen.has(i._id))];
      });
      setExtra((prev) => prev.filter((i) => !pageIds.has(i._id)));
      cursorRef.current = page.nextCursor;
      setHasMore(page.hasMore);
      setLoaded(true);
    } catch {
      if (aliveRef.current) setError(true);
    } finally {
      busyRef.current = false;
      if (aliveRef.current) setLoading(false);
    }
  };

  // A new item created here. Until a page that contains it arrives it waits in
  // `extra` (the first page of a long thread holds only the oldest items), and
  // that page takes it over.
  const add = (item) => {
    if (loaded && !hasMore) setItems((p) => [...p, item]);
    else setExtra((p) => [...p, item]);
  };
  const remove = (id) => {
    setItems((p) => p.filter((i) => i._id !== id));
    setExtra((p) => p.filter((i) => i._id !== id));
  };
  const update = (id, patch) => {
    const apply = (p) => p.map((i) => (i._id === id ? { ...i, ...patch } : i));
    setItems(apply);
    setExtra(apply);
  };

  return { items, extra, hasMore, loaded, loading, error, loadMore, add, remove, update };
}
