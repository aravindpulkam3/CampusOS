// Stored links end up in <a href> / <img src> for other users, so only
// absolute http(s) URLs are accepted — never javascript:, data:, or relative
// values. new URL() normalizes case and surrounding whitespace, so variants
// like " JavaScript:..." are caught too.
export const isHttpUrl = (value) => {
  if (typeof value !== "string") return false;
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};
