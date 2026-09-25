import nodemailer from "nodemailer";
import { env } from "../config/env.js";

// SMTP settings are required in production (config/env.js refuses to boot
// without them). Only in explicit development mode may they be absent, in
// which case messages are printed to the console instead of being sent.
const transporter = env.smtp
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465, // implicit TLS; other ports upgrade via STARTTLS
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    })
  : null;

export const sendMail = async ({ to, subject, text }) => {
  if (!transporter) {
    if (env.isDevelopment) {
      console.log(`[MAIL:dev] to=${to} subject="${subject}"\n${text}`);
      return;
    }
    throw new Error("SMTP is not configured");
  }
  await transporter.sendMail({ from: env.smtp.from, to, subject, text });
};

// The token travels in the URL FRAGMENT: browsers never send fragments to
// servers, so it stays out of frontend-host, CDN and analytics logs and out of
// Referer headers. VerifyEmail.jsx reads it and removes it from history.
export const sendAccountClaimEmail = (to, token) =>
  sendMail({
    to,
    subject: "Activate your CampusOS account",
    text:
      "Use the link below to activate your CampusOS account and set your password.\n\n" +
      `${env.clientUrl}/verify-email#token=${token}\n\n` +
      "The link expires in 24 hours and can be used once. If you did not request it, ignore this email.",
  });

// Same fragment-token scheme as the activation link (ResetPassword.jsx reads it).
export const sendPasswordResetEmail = (to, token) =>
  sendMail({
    to,
    subject: "Reset your CampusOS password",
    text:
      "Use the link below to choose a new CampusOS password.\n\n" +
      `${env.clientUrl}/reset-password#token=${token}\n\n` +
      "The link expires in 30 minutes and can be used once. If you did not request it, ignore this email; your password has not changed.",
  });
