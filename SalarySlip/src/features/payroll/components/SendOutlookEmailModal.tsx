import { useState } from "react";
import { createPortal } from "react-dom";
import {
  Mail,
  Check,
  AlertCircle,
  Send,
  Copy,
  X,
  Paperclip,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { inr } from "@/shared/lib/format";
import type { Employee, PayrollResult } from "@/shared/types";
import { useSettings } from "@/features/settings/hooks/useSettings";
// imported from the file, not the feature index, to avoid a circular import
import { payslipService } from "@/features/payslips/services/payslipService";
import { env } from "@/config/env";

interface SendOutlookEmailModalProps {
  emp: Employee;
  res: PayrollResult;
  period: string;
  /** id of the finalized payslip, when the caller already has one */
  payslipId?: string;
  /**
   * Finalizes the run and resolves with the payslip id.
   *
   * The preview offers "Send via Outlook" before anything is finalized, and a
   * payslip cannot be mailed until it exists in history — so the send finalizes
   * first, exactly as the Generate button would.
   */
  ensurePayslip?: () => Promise<string>;
  onClose: () => void;
}

export function SendOutlookEmailModal({
  emp,
  res,
  period,
  payslipId,
  ensurePayslip,
  onClose,
}: SendOutlookEmailModalProps) {
  const { company, slipDefaults } = useSettings();
  const [recipientEmail, setRecipientEmail] = useState(emp.email || `${emp.name.toLowerCase().replace(/\s+/g, ".")}@example.com`);
  const [copied, setCopied] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [viewing, setViewing] = useState(false);

  const companyLegal = company.legalName || company.name || "COMM-IT INDIA PVT. LTD.";
  const subject = `Payslip for ${period} — ${companyLegal}`;

  // Formatted email body text state (editable by user).
  // Deliberately never quotes the PDF password — see payslipMessage() in
  // Backend/src/lib/payslipPayload.js; the password is shared out of band.
  const [emailBodyText, setEmailBodyText] = useState(`Dear ${emp.name},

Please find the attached salary slip for the month of ${period}.

Note: ${slipDefaults.footNote || "This is a computer generated salary slip and does not require signature,For any discrepancies, please contact the HR Department ."}

Best regards,
Human Resourse
${companyLegal}
`);

  const safeEmpName = emp.name.replace(/[^a-zA-Z0-9]/g, "_");
  const attachmentFileName = `${safeEmpName}_${emp.id}_Payslip_${period.replace(/\s+/g, "_")}.pdf`;

  // Mailto link for Outlook Desktop App
  const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBodyText)}`;

  const handleCopyBody = () => {
    navigator.clipboard.writeText(emailBodyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  /** Payload shared by the PDF download and the Outlook launcher. */
  const payslipPayload = () => ({
    employeeId: emp.id,
    employeeName: emp.name,
    dept: emp.dept,
    role: emp.role,
    period,
    emailBody: emailBodyText,
    netPay: inr(res.net),
    pan: emp.pan || "ABCDE1234F",
    uan: emp.uan || "101234567890",
    doj: emp.doj || "01-Jan-2024",
    bankName: emp.bankName || slipDefaults.bankName,
    bankAccountNo: emp.bankAccountNo || slipDefaults.bankAccountNo,
    pfAccountNo: emp.pfAccountNo || slipDefaults.pfAccountNo,
    ifsc: emp.ifsc || "",
    earnings: res.earnings,
    deductions: res.deductions,
    gross: res.gross,
    totalDeductions: res.totalDeductions,
    net: res.net,
    watermarkText: company.watermarkText,
    companyLogo: company.logoUrl,
    companyName: company.legalName || company.name,
    companyAddress: company.addressLines,
  });

  /** Read the server's error text; the route reports the real cause as JSON. */
  const readErrorMessage = async (response: Response, fallback: string) => {
    try {
      const text = await response.text();
      if (!text) return `${fallback} (HTTP ${response.status})`;
      try {
        const parsed = JSON.parse(text) as { message?: string };
        if (parsed.message) return parsed.message;
      } catch {
        /* not JSON — fall through to the raw text */
      }
      return `${fallback}: ${text.slice(0, 300)}`;
    } catch {
      return `${fallback} (HTTP ${response.status})`;
    }
  };

  /**
   * Offline fallback for handleDirectSend only. The attachment row offers *View*
   * rather than a download, because the point there is to check the document
   * before sending, not to end up with a copy in Downloads.
   */
  const handleDownloadAttachment = async (): Promise<boolean> => {
    setSendError(null);
    setSendSuccess(null);

    try {
      const response = await fetch(`${env.apiUrl}/payroll/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payslipPayload()),
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to generate PDF download");
        console.error("[PDF Download] server error:", message);
        setSendError(message);
        return false;
      }

      const pdfBlob = await response.blob();
      if (pdfBlob.size === 0) {
        setSendError("The server returned an empty PDF.");
        return false;
      }

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = attachmentFileName;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 1500);

      setSendSuccess(`Downloaded ${attachmentFileName} to your Downloads folder.`);
      return true;
    } catch (err) {
      console.error("[PDF Download Error]:", err);
      setSendError(
        `Could not reach the PDF service at ${env.apiUrl}. Make sure the backend is running.`,
      );
      return false;
    }
  };

  /**
   * Opens the PDF for inspection before the mail goes out.
   *
   * A finalized slip is read back from its stored snapshot — the very source the
   * mailer attaches — so what is checked here is what the employee receives.
   * Before finalizing no snapshot exists yet, so this falls back to the generator
   * and the row says as much, rather than quietly showing a different document.
   */
  const handleViewAttachment = async () => {
    setSendError(null);
    setSendSuccess(null);
    setViewing(true);

    try {
      const response = payslipId
        ? await fetch(`${env.apiUrl}/payroll/payslips/${payslipId}/pdf`)
        : await fetch(`${env.apiUrl}/payroll/generate-pdf`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payslipPayload()),
          });

      if (!response.ok) {
        setSendError(await readErrorMessage(response, "Could not open the attachment"));
        return;
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        setSendError("The server returned an empty PDF.");
        return;
      }

      const url = URL.createObjectURL(blob);
      if (!window.open(url, "_blank")) {
        URL.revokeObjectURL(url);
        setSendError(
          "Your browser blocked the preview tab — allow pop-ups for this site and try again.",
        );
        return;
      }
      // the new tab reads from this url, so it has to outlive this function
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      console.error("[Attachment preview]:", err);
      setSendError(
        `Could not reach the PDF service at ${env.apiUrl}. Make sure the backend is running.`,
      );
    } finally {
      setViewing(false);
    }
  };

  /**
   * Sends the payslip straight out through Outlook — the same call the Pay Run
   * and Payslips screens make, so all three compose and deliver identically.
   *
   * No compose window opens: the server attaches the PDF (kept in
   * Downloads\SalarySlip Payslips\<Period>\) and hands the mail to Outlook. If
   * that cannot go through, the server opens a draft instead so the payslip is
   * never silently lost.
   */
  const handleDirectSend = async () => {
    setSendError(null);
    setSendSuccess(null);
    setSending(true);

    try {
      const id = payslipId ?? (await ensurePayslip?.());
      if (!id) {
        setSendError(
          "This payslip has not been finalized yet, so there is nothing to send. Use “Generate & finalize payslip” first.",
        );
        return;
      }

      const outcome = await payslipService.email(id, {
        to: recipientEmail,
        emailBody: emailBodyText,
        fallbackToDraft: true,
      });

      const where = outcome.savedTo ? ` PDF saved to ${outcome.savedTo}.` : "";

      if (outcome.success) {
        setSendSuccess(`${outcome.message}${where}`);
      } else if (outcome.draftOpened) {
        // couldn't send, but the mail is on screen ready to go
        setSendSuccess(`${outcome.message}${where}`);
      } else {
        setSendError(`${outcome.message}${where}`);
      }
    } catch (err) {
      console.error("[Send Payslip Error]:", err);
      // Backend unreachable — fall back to the OS mail handler and a browser
      // download so the user can still send the payslip manually.
      window.location.href = mailtoUrl;
      const downloaded = await handleDownloadAttachment();
      setSendError(
        downloaded
          ? "Could not reach the backend, so the PDF was downloaded — please attach it manually."
          : `Could not reach the backend at ${env.apiUrl}. Make sure it is running.`,
      );
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl space-y-6 border border-slate-100 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0078D4] text-white shadow-md shadow-[#0078D4]/20">
              <Mail size={22} />
            </div>
            <div>
              <h3 className="m-0 text-[18px] font-bold text-slate-800 flex items-center gap-2">
                Send Payslip via Outlook
              </h3>
              <p className="m-0 text-[13px] text-slate-500 font-medium">
                {emp.name} ({emp.id}) · {period}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Email Recipient Input */}
        <div className="space-y-1.5">
          <label className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-slate-500">
            Recipient Email Address
          </label>
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-[14px] font-medium text-slate-800 focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#0078D4]/20 shadow-sm"
            placeholder="employee@company.com"
          />
        </div>

        {/* Subject & Summary Preview */}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 space-y-4 shadow-inner">
          <div className="flex flex-wrap justify-between items-center text-[13px] gap-2">
            <span className="font-semibold text-slate-500">Subject:</span>
            <span className="font-bold text-slate-800">{subject}</span>
          </div>
          <div className="flex flex-wrap justify-between items-center text-[13px] gap-2">
            <span className="font-semibold text-slate-500">Net Pay Amount:</span>
            <span className="font-mono text-[16px] font-extrabold text-emerald-600">₹ {inr(res.net)}</span>
          </div>

          {/* What will actually travel with the mail, openable before sending. */}
          <div className="flex flex-wrap justify-between items-center gap-2 text-[13px]">
            <span className="font-semibold text-slate-500">Attachment:</span>
            <span className="flex min-w-0 items-center gap-2">
              <Paperclip size={13} className="shrink-0 text-slate-400" />
              <span
                className="truncate font-mono text-[12px] font-semibold text-slate-800"
                title={attachmentFileName}
              >
                {attachmentFileName}
              </span>
              <button
                onClick={handleViewAttachment}
                disabled={viewing}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-[#0078D4] shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                title={
                  payslipId
                    ? "Open the exact PDF that will be attached"
                    : "Preview the PDF — on send it is regenerated from the finalized slip"
                }
              >
                {viewing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Eye size={12} />
                )}
                {viewing ? "Opening…" : "View"}
              </button>
            </span>
          </div>

          {!payslipId && (
            <p className="m-0 text-right text-[11px] text-slate-400">
              Not finalized yet — this is a preview; sending finalizes the slip first
              and attaches that.
            </p>
          )}

          <div className="relative">
            <textarea
              rows={7}
              value={emailBodyText}
              onChange={(e) => setEmailBodyText(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-[12px] font-mono text-slate-700 leading-relaxed focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#0078D4]/20 shadow-sm"
              placeholder="Edit email body text here..."
            />
            <button
              onClick={handleCopyBody}
              className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[10.5px] font-semibold text-slate-600 hover:bg-slate-200"
            >
              {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              {copied ? "Copied!" : "Copy Text"}
            </button>
          </div>
        </div>

        {/* Success / Failure Alerts */}
        {sendSuccess && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-[12.5px] text-emerald-700 font-medium">
            <Check size={16} className="shrink-0 text-emerald-600" />
            <span>{sendSuccess}</span>
          </div>
        )}
        {sendError && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-[12.5px] text-rose-700">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span>{sendError}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center pt-1">
          {/* Direct Send via Outlook App */}
          <Button
            onClick={handleDirectSend}
            disabled={sending}
            className="w-full justify-center bg-[#0078D4] hover:bg-[#005A9E] text-white py-3 text-[13.5px] font-bold shadow-md shadow-[#0078D4]/25 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Send size={16} />{" "}
            {sending ? "Sending…" : "Send via Outlook"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
