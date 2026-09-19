import { useState } from "react";
import { Hourglass } from "lucide-react";
import Row, { RowList } from "./Row";
import { closesInLabel } from "./format";

const VISIBLE = 3;

// Unacted opportunities closing today/tomorrow. Optional by design: renders
// nothing at all when there is nothing to miss.
const DontMiss = ({ items = [] }) => {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;

  const shown = expanded ? items : items.slice(0, VISIBLE);
  const hidden = items.length - VISIBLE;

  return (
    <section className="bg-white border border-gray-200/70 rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
      <header className="flex items-center gap-2 px-4 py-2 border-b border-gray-100">
        <Hourglass size={13} className="text-amber-500" />
        <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Don't Miss
        </h2>
      </header>
      <RowList>
        {shown.map((item) => (
          <li key={item.id}>
            <Row
              url={item.url}
              showChevron={!item.actionLabel}
              trailing={
                item.actionLabel && (
                  <span className="text-xs font-semibold text-gray-900 group-hover:underline flex-shrink-0">
                    {item.actionLabel} →
                  </span>
                )
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  item.urgency === "today" ? "bg-rose-500" : "bg-amber-400"
                }`}
                aria-hidden
              />
              <div className="flex-1 min-w-0 sm:flex sm:items-baseline sm:gap-2">
                <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                {item.subtitle && (
                  <p className="text-xs text-gray-400 truncate">{item.subtitle}</p>
                )}
              </div>
              <span
                className={`text-xs font-medium flex-shrink-0 ${
                  item.urgency === "today" ? "text-rose-600" : "text-amber-600"
                }`}
              >
                {closesInLabel(item.closesAt, item.urgency)}
              </span>
            </Row>
          </li>
        ))}
      </RowList>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-full px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 border-t border-gray-100 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15"
        >
          {expanded ? "Show less" : `View ${hidden} more`}
        </button>
      )}
    </section>
  );
};

export default DontMiss;
