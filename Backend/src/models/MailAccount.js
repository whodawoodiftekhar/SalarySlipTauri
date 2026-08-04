import mongoose from "mongoose";

/**
 * Which Outlook mailbox payslips are sent from.
 *
 * Just an address. Outlook on this machine is already signed in with modern auth, so
 * it is the only thing needed to control the sender — no password, no host, no port,
 * nothing to expire.
 *
 * There was an SMTP path here (address + password + host + port, with a "Test
 * connection" button). It was removed: Microsoft 365 refuses basic authentication by
 * tenant policy, so the password could never authenticate however correct it was, and
 * every send paid a failed SMTP attempt before falling back to Outlook anyway. Storing
 * a credential that cannot work is worse than not offering the field. Sending over
 * SMTP is still possible for a deployment that sets OUTLOOK_USER / OUTLOOK_PASS in the
 * environment — see createSmtpTransport — it simply is not configured from the UI.
 *
 * Kept in its own collection rather than on CompanySetup because
 * `GET /api/settings` returns that whole document to the browser; this one is read
 * through describeMailAccount, which is the only shape any route returns.
 */
const mailAccountSchema = new mongoose.Schema(
  {
    /** the mailbox Outlook should send as; must be an account in the local profile */
    user: { type: String, default: "" },
  },
  { timestamps: true, versionKey: false },
);

export const MailAccount = mongoose.model(
  "MailAccount",
  mailAccountSchema,
  "mailaccount",
);

/** The configured sending address, or "" when none has been chosen. */
export async function describeMailAccount() {
  if (mongoose.connection.readyState !== 1) return { user: "" };
  try {
    const doc = await MailAccount.findOne().lean();
    return { user: doc?.user || "" };
  } catch (err) {
    console.error("[MailAccount] read failed:", err.message);
    return { user: "" };
  }
}

/** Sets the sending address. */
export async function saveMailAccount({ user }) {
  await MailAccount.findOneAndUpdate(
    {},
    { $set: { user: typeof user === "string" ? user.trim() : "" } },
    { upsert: true },
  );
  return describeMailAccount();
}

/** Forgets it, so Outlook falls back to whichever account is its default. */
export async function clearMailAccount() {
  await MailAccount.deleteMany({});
  return describeMailAccount();
}
