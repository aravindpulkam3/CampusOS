import { useEffect } from "react";

// Names the browser tab after the page: "Drives · EventSphere". Screen readers
// announce it when the page changes, so each page gets its own. A falsy title
// leaves the tab as it is (a page that is still loading).
const useDocumentTitle = (title) => {
  useEffect(() => {
    if (title) document.title = `${title} · EventSphere`;
  }, [title]);
};

export default useDocumentTitle;
