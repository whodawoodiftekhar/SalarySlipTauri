import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  Check,
  Info,
  Loader2,
  Mail,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { errorMessage } from "@/services/httpError";
import {
  mailAccountService,
  type MailAccount,
} from "../services/mailAccountService";

const FIELD =
  "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-[14px] font-medium text-slate-800 focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#0078D4]/20 shadow-sm";
const LABEL =
  "text-[11.5px] font-bold uppercase tracking-[0.06em] text-slate-500";

/**
 * Chooses which Outlook mailbox payslips are sent from.
 *
 * Deliberately just an address and a verification. There used to be a password, SMTP
 * host, port and a "Test connection" button; they were removed because Microsoft 365
 * refuses basic authentication by tenant policy, so a password could never work and
 * the test could only ever fail. Outlook on this machine is already signed in, so the
 * address is the only setting that matters — and "Verify in Outlook" is the only check
 * that reflects how the mail actually leaves.
 */
export function MailAccountModal({
  onClose,
  onChange,
  initialUser = "",
}: {
  onClose: () => void;
  /** fires whenever the stored address changes, so callers can reflect it live */
  onChange?: (account: MailAccount) => void;
  /**
   * Address the caller already knows, so the form renders filled in immediately.
   *
   * The sidebar has fetched it to label its own chip; without this the dialog sat
   * behind a spinner for the first Outlook lookup even though the value was already
   * in hand upstream.
   */
  initialUser?: string;
}) {
  const [saved, setSaved] = useState<MailAccount | null>(
    initialUser ? { user: initialUser } : null,
  );
  const [user, setUser] = useState(initialUser);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"save" | "verify" | "clear" | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<string[] | null>(null);

  /**
   * One request on open.
   *
   * Verification returns the stored address alongside its result, so this no longer
   * waits for `GET /mail-account` and *then* a check that has to attach to Outlook —
   * two sequential trips where the slow one came second. The server caches the Outlook
   * lookup for 30s, so reopening the dialog answers immediately.
   */
  useEffect(() => {
    let alive = true;
    mailAccountService
      .verifyOutlook()
      .then((check) => {
        if (!alive) return;
        const address = check.savedUser ?? "";
        setSaved({ user: address });
        // Never overwrite something already being typed: the caller's value was only
        // a head start, and this response can land after the first keystroke.
        setUser((current) => (current === initialUser ? address : current));
        setAccounts(check.accounts ?? null);
        if (address) {
          if (check.ok) setOk(check.message);
          else setError(check.message);
          setHint(check.hint ?? null);
        }
      })
      .catch((e) => alive && setError(errorMessage(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  /**
   * `refresh` is deliberate: this button is pressed precisely when someone has just
   * added a mailbox in Outlook, which is the one moment a cached answer would lie.
   */
  const runVerify = async () => {
    setBusy("verify");
    setOk(null);
    setError(null);
    setHint(null);
    const result = await mailAccountService.verifyOutlook(user, true);
    if (result.ok) setOk(result.message);
    else setError(result.message);
    setHint(result.hint ?? null);
    setAccounts(result.accounts ?? accounts);
    setBusy(null);
  };

  const runSave = async () => {
    setBusy("save");
    setOk(null);
    setError(null);
    setHint(null);
    try {
      const next = await mailAccountService.save(user);
      setSaved(next);
      onChange?.(next);

      // Saving an address nobody can send as is the failure worth catching here, so
      // the save is always followed by the check rather than reporting a bare "Saved".
      const check = await mailAccountService.verifyOutlook(next.user);
      setAccounts(check.accounts ?? accounts);
      if (!next.user) {
        setOk("Cleared. Payslips will go from whichever account is Default in Outlook.");
      } else if (check.ok) {
        setOk(`Saved. ${check.message}`);
      } else {
        setError(`Saved, but ${check.message}`);
        setHint(check.hint ?? null);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const runClear = async () => {
    if (
      !window.confirm(
        "Forget this mailbox?\n\nPayslips will go from whichever account is set as Default in Outlook.",
      )
    )
      return;

    setBusy("clear");
    setOk(null);
    setError(null);
    setHint(null);
    try {
      const cleared = await mailAccountService.clear();
      setSaved(cleared);
      onChange?.(cleared);
      setUser("");
      setOk("Forgotten. Payslips will go from Outlook's default account.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const dirty = user.trim() !== (saved?.user ?? "").trim();

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-xl max-h-[92vh] space-y-5 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0078D4] text-white shadow-md shadow-[#0078D4]/20">
              <Mail size={22} />
            </div>
            <div>
              <h3 className="m-0 text-[18px] font-bold text-slate-800">
                Outlook sending account
              </h3>
              <p className="m-0 text-[13px] font-medium text-slate-500">
                The mailbox payslip emails are sent from
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {loading && !initialUser ? (
          <div className="flex items-center gap-2 py-6 text-[13px] text-slate-500">
            <Loader2 size={15} className="animate-spin" /> Checking Outlook…
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-[13px]">
              <span className="font-semibold text-slate-500">Sending as:</span>
              {saved?.user ? (
                <b className="text-emerald-600">{saved.user}</b>
              ) : (
                <b className="text-slate-700">Outlook's default account</b>
              )}
            </div>

            <div className="space-y-1.5">
              <label className={LABEL}>Email address</label>
              <input
                type="email"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className={FIELD}
                placeholder="you@comm-it.in"
                autoComplete="off"
              />
              <small className="block text-[11.5px] text-slate-500">
                No password needed — Outlook is already signed in on this machine.
              </small>
            </div>

            {/* The set of addresses that can genuinely be used. Anything else is
                silently sent from the signed-in account instead, so make choosing
                from this list the easy path. */}
            {accounts && accounts.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-[12px]">
                <b className="block text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
                  Outlook on this machine is signed in as
                </b>
                <ul className="m-0 mt-1.5 list-none space-y-1 p-0">
                  {accounts.map((a) => (
                    <li key={a} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setUser(a)}
                        className="border-none bg-transparent p-0 font-mono text-[12px] font-semibold text-[#0078D4] underline cursor-pointer"
                        title={`Use ${a}`}
                      >
                        {a}
                      </button>
                      {a.toLowerCase() === user.trim().toLowerCase() && (
                        <span className="text-[11px] font-semibold text-emerald-600">
                          ← selected
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <small className="mt-2 block text-[11px] text-slate-500">
                  To use a different mailbox, add it in Outlook (File → Add Account),
                  then verify again.
                </small>
              </div>
            )}

            {/* The first check runs while the form is already usable, so its progress
                belongs here rather than over the whole dialog. */}
            {loading && (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-[12.5px] text-slate-500">
                <Loader2 size={14} className="shrink-0 animate-spin" />
                <span>Checking Outlook…</span>
              </div>
            )}

            {ok && (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[12.5px] font-medium text-emerald-700">
                <Check size={16} className="mt-[1px] shrink-0 text-emerald-600" />
                <span>{ok}</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12.5px] text-rose-700">
                <AlertCircle size={16} className="mt-[1px] shrink-0 text-rose-600" />
                <span className="break-words">{error}</span>
              </div>
            )}

            {hint && (
              <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-[12px] leading-relaxed text-sky-900">
                <Info size={16} className="mt-[1px] shrink-0 text-sky-600" />
                <div className="min-w-0 space-y-1">
                  <b className="block text-[11px] font-bold uppercase tracking-[0.06em] text-sky-600">
                    What to do
                  </b>
                  <span className="block break-words">{hint}</span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                onClick={runSave}
                disabled={busy !== null || !dirty}
                className="flex-1 justify-center bg-[#0078D4] py-3 text-[13.5px] font-bold text-white shadow-md shadow-[#0078D4]/25 hover:bg-[#005A9E] disabled:opacity-70"
                title={dirty ? "Save this sending address" : "Nothing changed"}
              >
                {busy === "save" ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {busy === "save" ? "Saving…" : "Save"}
              </Button>

              <Button
                variant="ghost"
                onClick={runVerify}
                disabled={busy !== null}
                title="Ask Outlook whether it will send as this address"
              >
                {busy === "verify" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ShieldCheck size={14} />
                )}
                {busy === "verify" ? "Verifying…" : "Verify in Outlook"}
              </Button>

              {saved?.user && (
                <button
                  onClick={runClear}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1 rounded-lg border-none bg-transparent px-2 py-2 text-[12.5px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  title="Forget it and use Outlook's default account"
                >
                  {busy === "clear" ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  Forget
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
