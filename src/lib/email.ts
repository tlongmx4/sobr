import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

const resend = apiKey ? new Resend(apiKey) : null;

export function appUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
}

async function send(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY not set — printing email to console instead.\n` +
        `To: ${opts.to}\nSubject: ${opts.subject}\n\n${opts.text}\n`,
    );
    return;
  }
  const result = await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
  if (result.error) {
    console.error("[email] send failed", { name: result.error.name });
    throw new Error("Failed to send email");
  }
}

export async function sendVerificationEmail(opts: {
  to: string;
  name: string;
  token: string;
}) {
  const link = `${appUrl()}/verify-email?token=${encodeURIComponent(opts.token)}`;
  const subject = "Verify your sobr account";
  const text = `Hi ${opts.name},

Welcome to sobr. To finish setting up your account, verify your email by opening this link:

${link}

This link expires in 24 hours. If you didn't sign up for sobr, you can ignore this email.

— sobr`;
  const html = `<p>Hi ${escapeHtml(opts.name)},</p>
<p>Welcome to sobr. To finish setting up your account, verify your email by clicking the link below:</p>
<p><a href="${link}">Verify my email</a></p>
<p>This link expires in 24 hours. If you didn't sign up for sobr, you can ignore this email.</p>
<p>— sobr</p>`;
  await send({ to: opts.to, subject, html, text });
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  name: string;
  token: string;
}) {
  const link = `${appUrl()}/reset-password?token=${encodeURIComponent(opts.token)}`;
  const subject = "Reset your sobr password";
  const text = `Hi ${opts.name},

Someone asked to reset the password for your sobr account. If that was you, open this link to set a new password:

${link}

This link expires in 1 hour. If you didn't request a reset, you can ignore this email — your password won't change.

— sobr`;
  const html = `<p>Hi ${escapeHtml(opts.name)},</p>
<p>Someone asked to reset the password for your sobr account. If that was you, click the link below to set a new password:</p>
<p><a href="${link}">Reset my password</a></p>
<p>This link expires in 1 hour. If you didn't request a reset, you can ignore this email — your password won't change.</p>
<p>— sobr</p>`;
  await send({ to: opts.to, subject, html, text });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
