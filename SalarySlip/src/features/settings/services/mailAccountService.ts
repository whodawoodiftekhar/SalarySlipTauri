import { apiClient } from "@/services";
import { errorMessage, isHttpError } from "@/services/httpError";

/** The Outlook mailbox payslips are sent from. Just an address — no credentials. */
export interface MailAccount {
  user: string;
}

export interface MailVerifyResult {
  ok: boolean;
  /** what happened, in plain terms */
  message: string;
  /** what to do about it, when the server can say */
  hint?: string;
  /** mailboxes this machine's Outlook is signed in as */
  accounts?: string[];
  /** the address Outlook confirmed it will send as */
  sendsAs?: string;
  /** the stored address, so opening the dialog needs one request rather than two */
  savedUser?: string;
  /** answered from the server's short-lived cache instead of a fresh COM call */
  cached?: boolean;
}

export const mailAccountService = {
  async get(): Promise<MailAccount> {
    return apiClient.get<MailAccount>("/mail-account");
  },

  async save(user: string): Promise<MailAccount> {
    return apiClient.put<MailAccount>("/mail-account", { user });
  },

  async clear(): Promise<MailAccount> {
    return apiClient.delete<MailAccount>("/mail-account");
  },

  /**
   * Asks Outlook whether it will send as this mailbox.
   *
   * The only check worth having: Outlook is already signed in with modern auth and is
   * what carries the mail. Takes the address being edited so it can be confirmed
   * before saving. A rejection is an ordinary outcome, so it is returned rather than
   * thrown — and the body's `hint` and `accounts` are what make it actionable, which
   * is why the failure is parsed rather than reduced to its message.
   */
  async verifyOutlook(user?: string, refresh = false): Promise<MailVerifyResult> {
    try {
      return await apiClient.post<MailVerifyResult>("/mail-account/verify-outlook", {
        user: user ?? "",
        refresh,
      });
    } catch (e) {
      if (isHttpError(e) && typeof e.body === "string") {
        try {
          const parsed = JSON.parse(e.body) as Partial<MailVerifyResult>;
          if (parsed?.message) {
            return {
              ok: false,
              message: parsed.message,
              hint: parsed.hint,
              accounts: parsed.accounts,
              savedUser: parsed.savedUser,
              cached: parsed.cached,
            };
          }
        } catch {
          // not JSON — fall through to the generic message
        }
      }
      return { ok: false, message: errorMessage(e) };
    }
  },
};
