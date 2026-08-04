/**
 * Verifies a mailbox against the copy of Outlook installed on this machine.
 *
 * This is the check that matters. "Test connection" asks Microsoft's SMTP server
 * whether it will accept a password, and a Microsoft 365 tenant with basic
 * authentication switched off answers no however correct that password is — which
 * says nothing about whether payslips can be sent. Outlook is already signed in with
 * modern auth, so the useful question is: does this profile hold the address, and
 * will Outlook actually send as it?
 *
 * Everything here is read-only. A mail item is created to prove `SendUsingAccount`
 * takes, then closed with olDiscard so nothing is sent, saved, or left in Drafts.
 */
import { execFile } from "node:child_process";
import os from "node:os";

const MARKER = "VERIFY_JSON:";

/**
 * `SendUsingAccount` cannot be set with a plain assignment — PowerShell's COM
 * adapter drops it silently and the item keeps the default account. Only the
 * reflection setter takes, so that is what both this check and the real send use;
 * verifying any other way would prove something the send does not do.
 */
const script = `
$ErrorActionPreference = 'Stop'
$out = [ordered]@{
  outlookAvailable = $false
  accounts         = @()
  matched          = ''
  sendsAs          = ''
  isDefault        = $false
  onBehalfOf       = ''
  resolvedName     = ''
  addressType      = ''
  error            = ''
}

try {
    $Outlook = New-Object -ComObject Outlook.Application
    $out.outlookAvailable = $true

    $wanted = $env:VERIFY_ADDRESS
    if ($wanted) { $wanted = $wanted.Trim() }

    $picked = $null
    foreach ($acct in $Outlook.Session.Accounts) {
        $smtp = [string]$acct.SmtpAddress
        if ($smtp) {
            $out.accounts += $smtp
            # Outlook stores SmtpAddress lower-cased, so this must ignore case or a
            # mailbox typed as 'V-Dawood@Comm-it.in' never matches what is stored.
            if ($wanted -and ($smtp -ieq $wanted)) { $picked = $acct }
        }
    }

    if ($picked) {
        $out.matched = [string]$picked.SmtpAddress

        $probe = $Outlook.CreateItem(0)
        try {
            $probe.To = 'verify@localhost.invalid'
            $probe.Subject = 'account verification - never sent'
            [void]$probe.GetType().InvokeMember('SendUsingAccount',
                [System.Reflection.BindingFlags]::SetProperty, $null, $probe, @($picked))
            if ($probe.SendUsingAccount) {
                $out.sendsAs = [string]$probe.SendUsingAccount.SmtpAddress
            }
        } finally {
            # olDiscard - nothing saved, nothing sent, no draft left behind
            try { $probe.Close(1) } catch { }
        }

        if ($out.accounts.Count -gt 0 -and ($out.accounts[0] -ieq $out.matched)) {
            $out.isDefault = $true
        }
    }
    elseif ($wanted) {
        # Not a profile account — but Exchange can still send as another mailbox when
        # that mailbox grants Send As permission. Check the address exists in the
        # directory and that SentOnBehalfOfName takes, so the UI can offer this
        # instead of flatly reporting failure.
        # Resolve() alone proves nothing: for an unknown address Outlook happily
        # builds a one-off SMTP recipient and reports success, so 'ghost@nowhere'
        # looked as valid as a real colleague. AddressEntry.Type is the discriminator
        # — 'EX' means a genuine directory entry in this Exchange organisation, which
        # is the only kind that can grant Send As permission.
        try {
            $recipient = $Outlook.Session.CreateRecipient($wanted)
            if ($recipient.Resolve()) {
                $out.resolvedName = [string]$recipient.Name
                try { $out.addressType = [string]$recipient.AddressEntry.Type } catch { }
            }
        } catch { }

        $probe = $Outlook.CreateItem(0)
        try {
            $probe.To = 'verify@localhost.invalid'
            $probe.Subject = 'on-behalf verification - never sent'
            $probe.SentOnBehalfOfName = $wanted
            $out.onBehalfOf = [string]$probe.SentOnBehalfOfName
        } catch {
        } finally {
            try { $probe.Close(1) } catch { }
        }
    }
} catch {
    $out.error = $_.Exception.Message
}

Write-Output ('${MARKER}' + ($out | ConvertTo-Json -Compress -Depth 4))
`;

/**
 * Short-lived cache of verification results, keyed by address.
 *
 * Each check costs a PowerShell start plus a COM attach — around 0.8s — and the
 * answer depends on the Outlook profile, which changes when someone adds an account
 * and not otherwise. Reopening the dialog or checking the same mailbox twice in a row
 * should not pay that again.
 *
 * The TTL is deliberately short and `refresh` bypasses it entirely, because the one
 * moment staleness would mislead is exactly after adding a mailbox in Outlook — which
 * is what the Verify button is pressed to confirm.
 */
const CACHE_TTL_MS = 30_000;
const cache = new Map();

/** Drops cached answers; call after anything that could change the profile. */
export function clearOutlookVerifyCache() {
  cache.clear();
}

/**
 * @param address mailbox to look for; empty just enumerates the profile
 * @param opts.refresh skip the cache and ask Outlook again
 * @returns {Promise<{outlookAvailable: boolean, accounts: string[], matched: string,
 *   sendsAs: string, isDefault: boolean, onBehalfOf: string, resolvedName: string,
 *   addressType: string, inDirectory: boolean, error: string, cached?: boolean}>}
 */
export async function verifyOutlookAccount(address = "", { refresh = false } = {}) {
  const key = String(address || "").trim().toLowerCase();

  if (refresh) {
    // Clear everything, not just this key: adding a mailbox in Outlook changes the
    // answer for *every* address — the one that was just added becomes valid, and
    // any address previously reported as "not in the profile" may now be wrong.
    clearOutlookVerifyCache();
  } else {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return { ...hit.result, cached: true };
    }
  }

  const result = await runVerify(address);
  // Never cache a failure to reach Outlook: it is usually transient (Outlook still
  // starting), and caching it would keep reporting "unavailable" for half a minute.
  if (result.outlookAvailable) cache.set(key, { result, at: Date.now() });
  return result;
}

function runVerify(address = "") {
  if (os.platform() !== "win32") {
    return Promise.resolve({
      outlookAvailable: false,
      accounts: [],
      matched: "",
      sendsAs: "",
      isDefault: false,
      onBehalfOf: "",
      resolvedName: "",
      addressType: "",
      inDirectory: false,
      error: "Outlook automation is only available on Windows.",
    });
  }

  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
      {
        // the address travels in the environment, never interpolated into the script,
        // so a quote in it cannot break out and become PowerShell
        env: { ...process.env, VERIFY_ADDRESS: String(address || "") },
        timeout: 60_000,
        windowsHide: true,
      },
      (err, stdout) => {
        const line = String(stdout || "")
          .split(/\r?\n/)
          .find((l) => l.startsWith(MARKER));

        if (!line) {
          resolve({
            outlookAvailable: false,
            accounts: [],
            matched: "",
            sendsAs: "",
            isDefault: false,
            error:
              err?.message ||
              "Outlook did not respond. Is classic Outlook installed and running on this machine?",
          });
          return;
        }

        try {
          const parsed = JSON.parse(line.slice(MARKER.length));
          resolve({
            outlookAvailable: Boolean(parsed.outlookAvailable),
            // ConvertTo-Json collapses a one-element array to a bare value
            accounts: Array.isArray(parsed.accounts)
              ? parsed.accounts
              : parsed.accounts
                ? [parsed.accounts]
                : [],
            matched: parsed.matched || "",
            sendsAs: parsed.sendsAs || "",
            isDefault: Boolean(parsed.isDefault),
            onBehalfOf: parsed.onBehalfOf || "",
            resolvedName: parsed.resolvedName || "",
            addressType: parsed.addressType || "",
            /** a real mailbox in this Exchange org, not a one-off SMTP recipient */
            inDirectory: String(parsed.addressType || "").toUpperCase() === "EX",
            error: parsed.error || "",
          });
        } catch (parseErr) {
          resolve({
            outlookAvailable: false,
            accounts: [],
            matched: "",
            sendsAs: "",
            isDefault: false,
            error: `Could not read Outlook's reply: ${parseErr.message}`,
          });
        }
      },
    );
  });
}
