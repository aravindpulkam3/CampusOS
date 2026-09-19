// Escapes user input for use as a literal inside a RegExp, so a search like
// "c++" or "(" matches text instead of throwing (or backtracking badly).
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default escapeRegex;
