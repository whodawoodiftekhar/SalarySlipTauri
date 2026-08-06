import nodemailer from "nodemailer";
import { deliverViaOutlook } from "../lib/outlookLauncher.js";

/**
 * Sends password reset email to user's registered Outlook / Email address.
 */
export async function sendPasswordResetEmail({ toEmail, resetToken, hostOrigin }) {
  const resetUrl = `${hostOrigin || "http://localhost:5173"}/reset-password?token=${resetToken}`;
  const subject = "Password Reset Request - HR Portal";
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background-color: #ffffff;">
      <h2 style="color: #0f172a; margin-top: 0;">Password Reset Request</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">
        You requested a password reset for your <strong>HR Portal</strong> administrator account.
      </p>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">
        Please click the button below to set a new password. This link is valid for <strong>15 minutes</strong>.
      </p>
      <div style="margin: 28px 0; text-align: center;">
        <a href="${resetUrl}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="color: #64748b; font-size: 12px; line-height: 1.5;">
        Or copy and paste this link into your web browser:<br/>
        <a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a>
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 11px; margin-bottom: 0;">
        If you did not request a password reset, please ignore this email. Your password will remain unchanged.
      </p>
    </div>
  `;

  const textContent = `
Password Reset Request - HR Portal

You requested a password reset for your HR Portal account.
Please click or copy the link below to set a new password (valid for 15 minutes):

${resetUrl}

If you did not request a password reset, please ignore this email.
  `;

  // 1. Try Desktop Outlook Delivery via COM
  try {
    const outlookRes = await deliverViaOutlook({
      to: toEmail,
      subject,
      body: textContent,
      send: true,
    });
    if (outlookRes && outlookRes.sent) {
      console.log(`[Email Service] Password reset email delivered to ${toEmail} via Outlook COM`);
      return { success: true, method: "outlook" };
    }
  } catch (err) {
    console.warn("[Email Service] Desktop Outlook COM send skipped:", err.message);
  }

  // 2. Fallback to Nodemailer Transport (Outlook / Office365 SMTP or Ethereal / Local transport)
  try {
    const smtpHost = process.env.SMTP_HOST || "smtp.office365.com";
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    const smtpUser = process.env.SMTP_USER || "payroll@comm-it.com";
    const smtpPass = process.env.SMTP_PASS || process.env.OUTLOOK_PASS;

    if (smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          ciphers: "SSLv3",
          rejectUnauthorized: false,
        },
      });

      await transporter.sendMail({
        from: `"HR Portal" <${smtpUser}>`,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`[Email Service] Password reset email sent to ${toEmail} via Nodemailer SMTP`);
      return { success: true, method: "smtp" };
    }
  } catch (err) {
    console.error("[Email Service] SMTP send failed:", err.message);
  }

  // Log reset URL for development fallback if mailer is offline
  console.log(`[Email Service Dev Fallback] Password Reset Link for ${toEmail}: ${resetUrl}`);
  return { success: true, method: "dev_log", resetUrl };
}
