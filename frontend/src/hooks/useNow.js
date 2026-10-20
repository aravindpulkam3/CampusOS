import { useEffect, useState } from "react";

// The current time in milliseconds, refreshed every `interval` (a minute by
// default), so "now" markers and minutes-left labels stay true while a page
// is left open.
const useNow = (interval = 60000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(id);
  }, [interval]);
  return now;
};

export default useNow;
