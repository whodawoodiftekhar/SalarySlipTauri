import nodemailer from "nodemailer";
import { deliverViaOutlook } from "../lib/outlookLauncher.js";
import { describeMailAccount } from "../models/MailAccount.js";

/**
 * Sends direct login password email to user's registered Outlook / Email address.
 */
export async function sendDirectPasswordEmail({ toEmail, password }) {
  const subject = "Your HR Portal Login Password";
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; background-color: #ffffff;">
      <h2 style="color: #0f172a; margin-top: 0;">HR Portal Administrator Password</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">
        You requested your login credentials for the <strong>HR Portal</strong> administrator account.
      </p>
      <p style="color: #475569; font-size: 14px; line-height: 1.5; margin-bottom: 8px;">
        Your current account login password is:
      </p>
      <div style="margin: 20px 0; text-align: center;">
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; color: #0f172a; font-family: monospace, Courier, sans-serif; font-size: 22px; font-weight: bold; padding: 14px 28px; border-radius: 8px; display: inline-block; letter-spacing: 1px;">
          ${password}
        </div>
      </div>
      <p style="color: #475569; font-size: 13px; line-height: 1.5;">
        You can return to the <strong>Sign In</strong> screen and log in using this password.
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 11px; margin-bottom: 0;">
        If you did not request your password, please log in and update your password in your Profile settings.
      </p>
    </div>
  `;

  const textContent = `
HR Portal Administrator Password

You requested your login credentials for the HR Portal account.

Your current account login password is: ${password}

Please return to the Sign In screen and log in using this password.
  `;

  // Get configured Outlook account if set
  let configuredUser = "";
  try {
    const mailAcc = await describeMailAccount();
    if (mailAcc && mailAcc.user) {
      configuredUser = mailAcc.user;
    }
  } catch {
    /* fallback to system default */
  }

  // 1. Try Desktop Outlook Delivery via COM
  try {
    const outlookRes = await deliverViaOutlook({
      to: toEmail,
      subject,
      body: textContent,
      send: true,
      sendAs: configuredUser,
    });
    if (outlookRes && outlookRes.sent) {
      console.log(`[Email Service] Password email delivered to ${toEmail} via Outlook COM`);
      return { success: true, method: "outlook" };
    }
  } catch (err) {
    console.warn("[Email Service] Desktop Outlook COM send skipped:", err.message);
  }

  // 2. Fallback to Nodemailer Transport (Outlook / Office365 SMTP)
  try {
    const smtpHost = process.env.SMTP_HOST || "smtp.office365.com";
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    const smtpUser = process.env.SMTP_USER || configuredUser || "payroll@comm-it.com";
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

      console.log(`[Email Service] Password email sent to ${toEmail} via Nodemailer SMTP`);
      return { success: true, method: "smtp" };
    }
  } catch (err) {
    console.error("[Email Service] SMTP send failed:", err.message);
  }

  // Log password for dev fallback if mailer is offline
  console.log(`[Email Service Dev Fallback] Login Password for ${toEmail}: ${password}`);
  return { success: true, method: "dev_log", password };
}
