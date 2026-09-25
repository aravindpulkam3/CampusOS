import ApiError from "./apiError.js";

export const normalizeSearch = (value) => {
  const search = typeof value === "string" ? value.trim() : "";
  if (search.length > 100) throw new ApiError(400, "Search must be at most 100 characters.");
  return search;
};

export const parseQueryInt = (value, fallback, min = 1, max = Infinity) => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min) return fallback;
  return Math.min(parsed, max);
};
