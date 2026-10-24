// Captures the app's real log output as parsed JSON lines. In a test file:
//
//   const logs = vi.hoisted(() => []);
//   vi.mock("../config/logger.js", (importOriginal) => captureLogger(importOriginal, logs));
//
// The logger keeps its real serializers and redaction; only the destination
// (an array instead of stdout) and the level (debug instead of silent) differ.
export const captureLogger = async (importOriginal, logs) => {
  const actual = await importOriginal();
  const logger = actual.createLogger({ write: (line) => logs.push(JSON.parse(line)) });
  logger.level = "debug";
  return { ...actual, default: logger };
};
