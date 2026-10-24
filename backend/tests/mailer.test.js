import { describe, expect, it, vi } from "vitest";

// tests/setup.js mocks the mailer for every file; this file needs the real one.
vi.unmock("../utils/mailer.js");
const { sendMail } = await vi.importActual("../utils/mailer.js");

describe("mailer without SMTP outside development", () => {
  it("refuses to send and never prints the message (it holds a one-time token)", async () => {
    const print = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      await expect(
        sendMail({ to: "a@college.edu", subject: "Activate", text: "/verify-email#token=secret" }),
      ).rejects.toThrow("SMTP is not configured");
      expect(print).not.toHaveBeenCalled();
    } finally {
      print.mockRestore();
    }
  });
});
