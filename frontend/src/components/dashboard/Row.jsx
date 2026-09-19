import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

// The one list-row primitive for every dashboard section. The whole row is the
// link when the backend supplied a url; otherwise it is inert and shows no
// chevron. `trailing` replaces the chevron (e.g. a CTA or due label).
const base = "flex items-center gap-3 px-4 py-2.5 min-h-[44px]";

const Row = ({ url, trailing, showChevron = true, className = "", children }) => {
  if (!url) {
    return (
      <div className={`${base} ${className}`}>
        {children}
        {trailing}
      </div>
    );
  }

  return (
    <Link
      to={url}
      className={`${base} group cursor-pointer hover:bg-gray-50 focus-visible:outline-none focus-visible:bg-gray-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15 transition-colors ${className}`}
    >
      {children}
      {trailing}
      {showChevron && (
        <ChevronRight
          size={14}
          className="flex-shrink-0 text-gray-300 group-hover:text-gray-500 transition-colors"
        />
      )}
    </Link>
  );
};

export const RowList = ({ children }) => (
  <ul className="divide-y divide-gray-100">{children}</ul>
);

export default Row;
