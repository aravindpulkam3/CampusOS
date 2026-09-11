// Presentation helpers shared by the dashboard sections. The backend already
// decided WHAT is relevant and sorted it; these only decide how it reads.

export const formatTime = (d) =>
  new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

export const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export const relativeTime = (d) => {
  const mins = Math.floor((Date.now() - new Date(d)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const isSameDay = (a, b) =>
  new Date(a).toDateString() === new Date(b).toDateString();

// Today / Tomorrow / Nd, with a colour that escalates as the date nears.
export const describeDue = (d) => {
  if (!d) return null;
  const date = new Date(d);
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);

  if (date < now && !isSameDay(date, now))
    return { label: "Overdue", color: "text-gray-400", bg: "bg-gray-50" };
  if (isSameDay(date, now))
    return { label: "Today", color: "text-red-600", bg: "bg-red-50" };
  if (isSameDay(date, tomorrow))
    return { label: "Tomorrow", color: "text-amber-600", bg: "bg-amber-50" };

  const days = Math.ceil((date - now) / 86400000);
  if (days <= 7)
    return { label: `${days}d`, color: "text-gray-600", bg: "bg-gray-50" };
  return { label: formatDate(d), color: "text-gray-400", bg: "bg-gray-50" };
};
