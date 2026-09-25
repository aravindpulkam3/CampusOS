// Returns the URL only if it is an absolute http(s) URL, otherwise undefined.
// Use for every stored, user/staff-supplied value rendered as an href: the
// backend validates on write, but older or directly-edited data may not be,
// and React 18 does not block javascript: hrefs.
const safeHref = (value) => {
  if (typeof value !== "string") return undefined;
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
};

export default safeHref;
