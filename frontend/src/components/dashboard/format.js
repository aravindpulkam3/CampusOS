// Presentation helpers for the dashboard sections. The backend already decided
// WHAT is relevant and sorted it; these only decide how it reads.
import { daysFromToday, formatShortDate } from "../../utils/formatDate";

// How close a due date is: `label` stands alone ("In 3 days"), `phrase` goes
// after a verb ("closes in 3 days"), `tone` escalates as the date nears.
export const describeDue = (d) => {
  if (!d) return null;
  const days = daysFromToday(d);
  if (days <= 0) return { label: "Today", phrase: "today", tone: "urgent" };
  if (days === 1) return { label: "Tomorrow", phrase: "tomorrow", tone: "warn" };
  if (days <= 7) return { label: `In ${days} days`, phrase: `in ${days} days` };
  const date = formatShortDate(d);
  return { label: date, phrase: `on ${date}` };
};

// "Closes in 6h" reads better than "Closes today" when the hour count is small.
export const closesInLabel = (closesAt, urgency) => {
  if (urgency === "tomorrow") return "Closes tomorrow";
  const hrs = Math.floor((new Date(closesAt) - Date.now()) / 3600000);
  if (hrs < 1) return "Closes within the hour";
  if (hrs <= 12) return `Closes in ${hrs}h`;
  return "Closes today";
};
