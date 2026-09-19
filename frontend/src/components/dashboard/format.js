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

  if (isSameDay(date, now)) return { label: "Today", color: "text-red-600" };
  if (isSameDay(date, tomorrow))
    return { label: "Tomorrow", color: "text-amber-600" };

  const days = Math.ceil((date - now) / 86400000);
  if (days <= 7) return { label: `${days}d`, color: "text-gray-500" };
  return { label: formatDate(d), color: "text-gray-400" };
};

// "Closes in 6h" reads better than "Closes today" when the hour count is small.
export const closesInLabel = (closesAt, urgency) => {
  if (urgency === "tomorrow") return "Closes tomorrow";
  const hrs = Math.floor((new Date(closesAt) - Date.now()) / 3600000);
  if (hrs < 1) return "Closes within the hour";
  if (hrs <= 12) return `Closes in ${hrs}h`;
  return "Closes today";
};
