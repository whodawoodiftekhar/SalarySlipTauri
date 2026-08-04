/**
 * Sends a stored payslip and stamps the delivery on it.
 *
 * Shared by the single re-send route and the bulk pay-run mailer so both report
 * identical statuses — a bulk run that silently swallowed "no address on file"
 * would look like a successful send to HR.
 */
import path from "node:path";
import { Payslip } from "../models/Payslip.js";
import { deliverViaOutlook, describeOutlookResult } from "./outlookLauncher.js";
import { writePayslipPdf } from "./payslipExport.js";
import {
  buildPayslipEmailHtml,
  createSmtpTransport,
  payslipMessage,
} from "./payslipPayload.js";

/**
 * @returns {Promise<{success: boolean, skipped?: boolean, recipient: string,
 *   message: string, emailedAt?: string}>} never throws — the caller reports it
 */
export async function emailOnePayslip({
  payslip,
  employee = {},
  settings = {},
  to,
  emailBody,
}) {
  const { companyName, recipient, subject, body } = payslipMessage({
    payslip,
    employee,
    settings,
    to,
    emailBody,
  });

  if (!recipient) {
    return {
      success: false,
      skipped: true,
      recipient: "",
      message: `No email address on record for ${employee?.name || payslip.employeeId}.`,
    };
  }

  const { transporter, user } = createSmtpTransport(settings);

  if (!transporter) {
    return {
      success: false,
      skipped: true,
      recipient,
      message:
        "SMTP is not configured (set OUTLOOK_PASS) — use the Outlook draft button instead.",
    };
  }

  try {
    // the attachment is the file kept in Downloads, exactly like the
    // per-employee "Send via Outlook & Download PDF" flow leaves behind
    const written = await writePayslipPdf({ payslip, employee, settings });

    await transporter.sendMail({
      from: `"${companyName || "COMM-IT Payroll"}" <${user}>`,
      to: recipient,
      subject,
      text: body,
      html: buildPayslipEmailHtml({
        companyName,
        period: payslip.period,
        employeeName: employee?.name,
        employeeId: payslip.employeeId,
        emailBody: body,
        earnings: payslip.result?.earnings,
        deductions: payslip.result?.deductions,
        gross: payslip.result?.gross,
        totalDeductions: payslip.result?.totalDeductions,
        net: payslip.result?.net,
        footNote: settings?.slipDefaults?.footNote,
      }),
      attachments: [
        {
          filename: written.fileName,
          path: written.filePath,
          contentType: "application/pdf",
        },
      ],
    });

    const stamped = await stampDelivery(
      payslip,
      recipient,
      `Payslip for ${payslip.period} sent to ${recipient}`,
    );
    return { ...stamped, savedTo: written.folder, fileName: written.fileName };
  } catch (err) {
    console.error("[Payslip Email Error]:", err);
    return {
      success: false,
      recipient,
      message: err.message || "Failed to send the payslip email",
    };
  }
}

/** Records a successful delivery on the slip so history shows it. */
async function stampDelivery(payslip, recipient, message) {
  const emailedAt = new Date();
  await Payslip.findByIdAndUpdate(payslip._id, { emailedAt, emailedTo: recipient });

  return {
    success: true,
    recipient,
    emailedAt: emailedAt.toISOString(),
    message,
  };
}

/**
 * Sends through the desktop Outlook profile instead of SMTP.
 *
 * This is what makes "Email all" work on a machine with no OUTLOOK_PASS: classic
 * COM attaches the PDF and sends as the signed-in user. The PDF goes to a temp
 * file because Outlook only needs it long enough to copy it onto the message.
 */
export async function outlookSendPayslip({
  payslip,
  employee = {},
  settings = {},
  to,
  emailBody,
}) {
  const { recipient, subject, body } = payslipMessage({
    payslip,
    employee,
    settings,
    to,
    emailBody,
  });

  if (!recipient) {
    return {
      success: false,
      skipped: true,
      recipient: "",
      via: "outlook",
      message: `No email address on record for ${employee?.name || payslip.employeeId}.`,
    };
  }
  if (process.platform !== "win32") {
    return {
      success: false,
      recipient,
      via: "outlook",
      message: "Outlook delivery is only supported on Windows.",
    };
  }

  try {
    // kept in Downloads rather than a temp file, so the folder ends up holding
    // exactly what was mailed — same as the per-employee Outlook flow
    const written = await writePayslipPdf({ payslip, employee, settings });

    const { result, error, output } = await deliverViaOutlook({
      to: recipient,
      subject,
      body,
      attachmentPath: written.filePath,
      send: true,
    });

    if (result !== "COM_SENT") {
      // the script reports Outlook's own wording on an INFO line — far more
      // useful to HR than a bare marker
      const detail = String(output || "").match(/INFO:(.+)/)?.[1]?.trim();

      return {
        success: false,
        recipient,
        via: "outlook",
        // the PDF is on disk either way, so HR can still attach it by hand
        savedTo: written.folder,
        fileName: written.fileName,
        message:
          result === "COM_UNAVAILABLE"
            ? `Classic Outlook automation is unavailable on this machine, so nothing was sent${detail ? ` (${detail})` : ""}. Set OUTLOOK_PASS to send over SMTP, or use the per-employee Outlook draft button.`
            : result === "COM_SEND_FAILED"
              ? `Outlook refused the send${detail ? ` — ${detail}` : ""}.`
              : `Outlook did not confirm the send (${result}${error ? `: ${error}` : ""}).`,
      };
    }

    const stamped = await stampDelivery(
      payslip,
      recipient,
      `Sent through Outlook to ${recipient} with ${written.fileName} attached.`,
    );
    return {
      ...stamped,
      via: "outlook",
      savedTo: written.folder,
      fileName: written.fileName,
    };
  } catch (err) {
    console.error("[Outlook Send Error]:", err);
    return {
      success: false,
      recipient,
      via: "outlook",
      message: err.message || "Failed to send through Outlook",
    };
  }
}

/**
 * Delivers a payslip by whichever route is available.
 *
 * `auto` prefers SMTP when a password is configured (fast, no desktop client
 * involved) and otherwise drives Outlook, so HR gets a working "Email all"
 * either way rather than a row of skips.
 */
export async function deliverPayslip({
  via = "auto",
  fallbackToDraft = false,
  ...args
}) {
  const { transporter } = createSmtpTransport(args.settings ?? {});
  const route = via === "auto" ? (transporter ? "smtp" : "outlook") : via;

  const outcome =
    route === "outlook"
      ? await outlookSendPayslip(args)
      : { via: "smtp", ...(await emailOnePayslip(args)) };

  // A skip means there was no address to send to, and a draft with no recipient
  // helps nobody — only a genuine delivery failure is worth falling back for.
  if (outcome.success || outcome.skipped || !fallbackToDraft) return outcome;

  return { ...outcome, ...(await openDraftInstead({ ...args, outcome })) };
}

/**
 * Last resort for the per-employee send: put the mail on screen as a draft so
 * the payslip still reaches the employee by hand.
 *
 * Deliberately not used by the bulk mailer — fifty compose windows is not a
 * recovery strategy.
 */
async function openDraftInstead({ payslip, employee = {}, settings = {}, to, emailBody, outcome }) {
  const { recipient, subject, body } = payslipMessage({
    payslip,
    employee,
    settings,
    to,
    emailBody,
  });

  try {
    // reuse the file the failed attempt already wrote, if it got that far
    const written =
      outcome.savedTo && outcome.fileName
        ? {
            filePath: path.join(outcome.savedTo, outcome.fileName),
            fileName: outcome.fileName,
            folder: outcome.savedTo,
          }
        : await writePayslipPdf({ payslip, employee, settings });

    const { result } = await deliverViaOutlook({
      to: recipient,
      subject,
      body,
      attachmentPath: written.filePath,
      mode: "new",
      send: false,
    });

    const draft = describeOutlookResult(result, written.fileName);

    return {
      draftOpened: result !== "FAILED" && result !== "UNKNOWN",
      savedTo: written.folder,
      fileName: written.fileName,
      message: `${outcome.message} A draft was opened instead — ${draft.message}`,
    };
  } catch (err) {
    console.error("[Draft Fallback Error]:", err);
    return {
      draftOpened: false,
      message: `${outcome.message} Opening a draft also failed (${err.message}).`,
    };
  }
}
