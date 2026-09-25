// Every exported cell goes through escapeCsvCell, whatever its column: a value
// starting with = + - @ tab or CR would be run as a formula by Excel/Sheets
// (CSV/formula injection), so it is prefixed with ' to force text. Then the
// cell is quoted, with embedded quotes doubled.
const FORMULA_START = /^[=+\-@\t\r]/;

export const escapeCsvCell = (value) => {
  let text = String(value ?? "");
  if (FORMULA_START.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

export const toCsv = (rows) => rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
