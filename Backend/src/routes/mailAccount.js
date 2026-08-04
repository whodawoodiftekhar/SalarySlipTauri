import { Router } from "express";
import {
  clearMailAccount,
  describeMailAccount,
  saveMailAccount,
} from "../models/MailAccount.js";
import { verifyOutlookAccount } from "../lib/outlookVerify.js";

const router = Router();

/**
 * The Outlook mailbox payslips are sent from.
 *
 * Only an address is stored. The SMTP routes that used to live here — a password
 * field and a "Test connection" that asked Microsoft's SMTP server for permission —
 * were removed: the tenant refuses basic authentication, so the test could only ever
 * fail and the stored password could only ever waste an attempt. Outlook is already
 * signed in with modern auth and is what actually carries the mail, so the one
 * meaningful check is whether it will send as this address.
 */

/** GET /api/mail-account — the configured sending address */
router.get("/", async (_req, res) => {
  try {
    res.json(await describeMailAccount());
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not read the mail account" });
  }
});

/** PUT /api/mail-account — set the sending address */
router.put("/", async (req, res) => {
  const user = typeof req.body?.user === "string" ? req.body.user.trim() : "";

  if (user && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user)) {
    return res.status(400).json({ message: "That does not look like an email address." });
  }

  try {
    res.json(await saveMailAccount({ user }));
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not save the mail account" });
  }
});

/** DELETE /api/mail-account — forget it; Outlook falls back to its default account */
router.delete("/", async (_req, res) => {
  try {
    res.json(await clearMailAccount());
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not clear the mail account" });
  }
});

/**
 * POST /api/mail-account/verify-outlook — can Outlook actually send as this address?
 *
 * Three outcomes, and the middle one is the reason this check exists at all:
 *
 *  - an account in the local Outlook profile  -> guaranteed; SendUsingAccount is used
 *  - a mailbox in the directory but not here  -> **fails**. Outlook accepts the
 *      on-behalf request and Exchange then silently discards it without Send As
 *      permission, delivering from the signed-in account instead. Measured, no bounce
 *      and no error, so it must be reported as a failure or payslips go out under the
 *      wrong identity unnoticed.
 *  - anything else                            -> fails
 */
router.post("/verify-outlook", async (req, res) => {
  try {
    const saved = await describeMailAccount();
    const address = String(req.body?.user || saved.user || "").trim();

    // `savedUser` rides along so the dialog can open on one request instead of a
    // GET followed by this — the two were sequential, and the second waits on COM.
    const savedUser = saved.user;
    // The Verify button asks for a fresh look; opening the dialog is happy with the
    // 30s cache, which is what makes reopening it instant.
    const result = await verifyOutlookAccount(address, {
      refresh: Boolean(req.body?.refresh),
    });

    // Every branch answers with the same envelope, so `savedUser`, the account list
    // and the cache flag cannot be forgotten on one of them.
    const reply = (status, payload) =>
      res.status(status).json({
        savedUser,
        accounts: result.accounts ?? [],
        cached: Boolean(result.cached),
        ...payload,
      });

    if (!result.outlookAvailable) {
      return reply(400, {
        ok: false,
        accounts: [],
        message:
          result.error ||
          "Classic Outlook is not available on this machine, so it cannot send payslips.",
      });
    }

    if (!address) {
      return reply(400, {
        ok: false,
        message: `Choose an email address first. Outlook on this machine is signed in as: ${result.accounts.join(", ") || "no accounts"}.`,
      });
    }

    const sender = result.accounts[0] || "the default account";

    if (result.matched && result.sendsAs) {
      return reply(200, {
        ok: true,
        message: `Verified — Outlook will send payslips as ${result.sendsAs}.`,
        sendsAs: result.sendsAs,
      });
    }

    if (result.matched) {
      return reply(400, {
        ok: false,
        message: `Outlook knows ${result.matched} but would not accept it as the sending account, so mail would go from ${sender}.`,
      });
    }

    // `inDirectory` distinguishes a real organisation mailbox from arbitrary text:
    // Resolve() succeeds for any valid-looking address by inventing a one-off SMTP
    // recipient, so without it a typo would look like a working configuration.
    if (result.inDirectory) {
      const who =
        result.resolvedName && result.resolvedName !== address
          ? ` (${result.resolvedName})`
          : "";
      return reply(400, {
        ok: false,
        message: `${address}${who} exists in your organisation but is not signed in to Outlook on this machine, so payslips would be sent as ${sender} instead — silently, with no error.`,
        hint: `Add ${address} to Outlook (File → Add Account) and verify again — that is the only way the sender can be guaranteed. An admin granting Send As with \`Add-RecipientPermission ${address} -Trustee ${sender} -AccessRights SendAs\` would also work, but nothing here can confirm it beforehand: without the permission Exchange just sends as ${sender} rather than reporting a problem.`,
      });
    }

    reply(400, {
      ok: false,
      message: `Outlook has no account for ${address} and it is not a mailbox in your organisation. Payslips would go from ${sender} instead.`,
      hint: `Outlook here is signed in as: ${result.accounts.join(", ") || "(none)"}. Check the spelling, add ${address} to Outlook, or pick one of those.`,
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message || "Verification failed" });
  }
});

export default router;
