import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, CheckCircle2 } from "lucide-react";

const VISIBLE = 3;

// Backend-provided actionLabel is often a generic "View …" filler repeated
// across almost every kind — showing it on every row is exactly the noise
// this redesign removes. Only a label that adds real meaning (e.g. "Apply")
// survives; everything else falls back to a bare chevron.
const GENERIC_LABELS = new Set(["View", "View drive", "View event"]);

const severityDot = {
  critical: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-blue-500",
};

const ImportantItem = ({ item }) => {
  const dot = severityDot[item.severity] || "bg-gray-300";
  const label =
    item.actionLabel && !GENERIC_LABELS.has(item.actionLabel)
      ? item.actionLabel
      : null;

  const content = (
    <>
      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 leading-snug">
          <span className="font-medium">{item.title}</span>
          {item.subtitle && (
            <span className="text-gray-400 font-normal"> · {item.subtitle}</span>
          )}
        </p>
      </div>
      {/* No fake chevron: a row with no destination gets no affordance at all. */}
      {item.url && (
        <span className="flex items-center gap-0.5 text-xs flex-shrink-0 mt-0.5">
          {label && <span className="font-semibold text-gray-600">{label}</span>}
          <ChevronRight size={14} className="text-gray-300" />
        </span>
      )}
    </>
  );

  const className =
    "flex items-start gap-3 px-4 py-3 transition-colors" +
    (item.url
      ? " hover:bg-gray-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-200"
      : "");

  return item.url ? (
    <Link to={item.url} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
};

// Renamed from "Action Required": the backend field is still called
// actionRequired (see Dashboard.jsx) since several items here — an updated
// OA venue, a cancelled class — are important to notice but aren't actions
// at all. Renaming the API contract wasn't worth the churn; only the
// frontend-facing label changed.
const ImportantToday = ({ items = [] }) => {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-100 rounded-2xl">
        <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
        <p className="text-sm text-gray-500">You're all caught up.</p>
      </div>
    );
  }

  // The backend never truncates this list — folding is presentational only,
  // so nothing important can be lost between the API and the screen.
  const shown = expanded ? items : items.slice(0, VISIBLE);
  const hidden = items.length - shown.length;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">Important Today</h3>
        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
          {items.length}
        </span>
      </div>

      <div className="divide-y divide-gray-50">
        {shown.map((item) => (
          <ImportantItem key={item.id} item={item} />
        ))}
      </div>

      {(hidden > 0 || expanded) && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full py-2 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors border-t border-gray-50"
        >
          {expanded ? "Show less" : `View ${hidden} more`}
        </button>
      )}
    </div>
  );
};

export default ImportantToday;
