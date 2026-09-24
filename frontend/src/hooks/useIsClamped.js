import { useLayoutEffect, useState } from "react";

// Whether a line-clamped element is actually cutting its text off, so a
// "Show more" toggle only appears when there is more to show. Measured while
// collapsed (and again whenever the element resizes); once expanded, the last
// answer is kept so the toggle can offer "Show less".
const useIsClamped = (ref, collapsed, content) => {
  const [clamped, setClamped] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !collapsed) return;
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, collapsed, content]);

  return clamped;
};

export default useIsClamped;
