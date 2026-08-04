import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Mail } from "lucide-react";
import { MailAccountModal } from "@/features/settings/components/MailAccountModal";
import {
  mailAccountService,
  type MailAccount,
} from "@/features/settings/services/mailAccountService";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { LOGO } from "@/shared/lib/branding";
import { cn } from "@/shared/lib/cn";
import { matchNav, NAV } from "./navigation";

export function Sidebar() {
  const { company, currentUser } = useSettings();
  const { pathname } = useLocation();
  const active = matchNav(pathname);
  const [collapsed, setCollapsed] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const [mail, setMail] = useState<MailAccount | null>(null);

  // Read once on mount; the modal reports its own changes through onChange, so
  // this never has to poll or be invalidated from elsewhere.
  useEffect(() => {
    let alive = true;
    mailAccountService
      .get()
      .then((a) => alive && setMail(a))
      .catch(() => {
        /* the chip just falls back to the settings address */
      });
    return () => {
      alive = false;
    };
  }, []);

  /**
   * Prefer the mailbox payslips are actually sent from.
   *
   * `currentUser.email` is a static Company Setup value — it was showing
   * payroll@comm-it.com while mail really left as v-dawood@Comm-it.in, which is
   * exactly the sort of quiet disagreement that costs an afternoon.
   */
  const sendingAddress = mail?.user?.trim() || "";
  const shownEmail = sendingAddress || currentUser.email;

  return (
    <aside
      className={cn(
        "relative sticky top-0 z-[60] flex h-screen flex-col overflow-visible border-r border-line bg-white px-[14px] py-[18px] transition-all duration-300",
        collapsed ? "w-[64px] items-center px-[8px]" : "w-[236px]",
        "max-mob:z-20 max-mob:h-auto max-mob:w-full max-mob:flex-row max-mob:items-center max-mob:gap-[6px] max-mob:overflow-x-auto max-mob:px-3 max-mob:py-[10px]",
      )}
    >
      {/* Toggle button on border edge */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute top-[22px] -right-[13px] z-[60] flex h-[26px] w-[26px] items-center justify-center rounded-full border border-line bg-white text-ash shadow-sm transition-all duration-200 hover:bg-hover hover:text-accent hover:border-accent/40 max-mob:hidden"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>

      {/* Logo & subtitle */}
      <div className={cn(
        "flex flex-col gap-[3px] pb-[18px] pt-1 max-mob:mr-[6px] max-mob:flex-none max-mob:p-0",
        collapsed ? "items-center px-0" : "px-2",
      )}>
        <img
          src={company.logoUrl || LOGO}
          alt={company.name}
          className={cn(
            "w-auto object-contain max-mob:h-[26px] transition-all duration-300",
            collapsed ? "h-6 max-h-6" : "h-8 max-h-8",
          )}
        />

        {!collapsed && (
          <small className="text-[11px] text-mist max-mob:hidden">
            Payroll · HR
          </small>
        )}
      </div>

      {/* Navigation links */}
      <nav className="flex flex-1 flex-col gap-[2px] max-mob:flex-row max-mob:gap-[4px] max-mob:overflow-x-auto">
        {NAV.filter((n) => !n.hidden).map((n) => (
          <NavLink
            key={n.id}
            to={n.path}
            title={collapsed ? n.label : undefined}
            className={cn(
              "flex items-center rounded-[9px] text-left font-medium transition-all duration-200",
              "max-mob:whitespace-nowrap max-mob:px-[11px] max-mob:py-2",
              collapsed
                ? "justify-center px-0 py-[10px]"
                : "gap-[11px] px-3 py-[10px]",
              active.id === n.id
                ? "bg-accent-soft font-semibold text-accent"
                : "text-ash hover:bg-hover hover:text-ink",
            )}
          >
            <n.icon size={17} />
            {!collapsed && <span>{n.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info — also the way in to the mailbox payslips are sent from */}
      <button
        onClick={() => setMailOpen(true)}
        title={
          sendingAddress
            ? `Payslips are sent as ${sendingAddress} through Outlook — click to change`
            : "No sending account chosen — payslips go from whichever account is Default in Outlook. Click to choose one."
        }
        className={cn(
          "group flex items-center rounded-[9px] border-none bg-transparent pb-1 pt-3 text-left transition-colors cursor-pointer hover:bg-hover max-mob:hidden",
          "border-t border-line",
          collapsed ? "justify-center px-0" : "gap-[10px] px-2",
        )}
      >
        <span className="relative grid h-[34px] w-[34px] flex-none place-items-center rounded-full bg-accent-soft text-[12px] font-bold text-accent">
          {currentUser.initials}
          {/* collapsed leaves only the avatar, so the dot carries the state */}
          {sendingAddress && (
            <span
              className="absolute -bottom-[1px] -right-[1px] h-[10px] w-[10px] rounded-full border-2 border-white bg-earn"
              aria-hidden
            />
          )}
        </span>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <b className="block truncate text-[13px]">{currentUser.name}</b>
              <small
                className={cn(
                  "block truncate text-[11px]",
                  sendingAddress ? "font-semibold text-earn" : "text-mist",
                )}
              >
                {shownEmail}
              </small>
              {sendingAddress && (
                <small className="block truncate text-[10px] uppercase tracking-[0.05em] text-mist">
                  sending account
                </small>
              )}
            </div>
            <Mail
              size={15}
              className="flex-none text-mist transition-colors group-hover:text-accent"
            />
          </>
        )}
      </button>

      {mailOpen && (
        <MailAccountModal
          onClose={() => setMailOpen(false)}
          onChange={setMail}
          // already fetched for the chip above, so the dialog opens filled in
          initialUser={sendingAddress}
        />
      )}
    </aside>
  );
}
