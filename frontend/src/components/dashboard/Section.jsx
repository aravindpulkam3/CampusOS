import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

// Shared card shell for every dashboard section — extracted from the old
// inline atoms in Dashboard.jsx so the sections stay visually identical.
export const Section = ({ title, icon: Icon, linkTo, linkLabel, children }) => (
  <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={13} className="text-gray-400 flex-shrink-0" />}
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {linkTo && (
        <Link
          to={linkTo}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-900 transition-colors"
        >
          {linkLabel || "View all"} <ChevronRight size={11} />
        </Link>
      )}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

// Compact empty state — deliberately short so a quiet day doesn't leave the
// dashboard full of large hollow cards.
export const Empty = ({ message }) => (
  <div className="flex items-center justify-center h-16 rounded-xl bg-gray-50 border border-dashed border-gray-200">
    <p className="text-xs text-gray-400 text-center px-3">{message}</p>
  </div>
);

export default Section;
