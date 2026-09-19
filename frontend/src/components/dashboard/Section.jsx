import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

// Shared card shell for every dashboard section. Lists render edge-to-edge
// inside it; `primary` gives the two "today" sections a slightly stronger header.
export const Section = ({
  title,
  icon: Icon,
  linkTo,
  linkLabel,
  variant = "secondary",
  children,
  footer,
}) => (
  <section className="bg-white border border-gray-200/70 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden flex flex-col">
    <header className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-gray-100">
      <div className="flex items-center gap-2 min-w-0">
        {Icon && (
          <Icon
            size={14}
            className={variant === "primary" ? "text-gray-700" : "text-gray-400"}
          />
        )}
        <h2
          className={`truncate ${
            variant === "primary"
              ? "text-[13px] font-semibold text-gray-900"
              : "text-xs font-semibold text-gray-700 uppercase tracking-wide"
          }`}
        >
          {title}
        </h2>
      </div>
      {linkTo && (
        <Link
          to={linkTo}
          className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-gray-900 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 transition-colors"
        >
          {linkLabel || "View all"} <ChevronRight size={12} />
        </Link>
      )}
    </header>
    <div className="flex-1">{children}</div>
    {footer && (
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
        {footer}
      </div>
    )}
  </section>
);

export const Empty = ({ message }) => (
  <p className="px-4 py-5 text-xs text-gray-400">{message}</p>
);

export default Section;
