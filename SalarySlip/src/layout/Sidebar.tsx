import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Mail, LogOut, X } from "lucide-react";
import { MailAccountModal } from "@/features/settings/components/MailAccountModal";
import { useAuth } from "@/features/auth/AuthContext";
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = matchNav(pathname);
  const [collapsed, setCollapsed] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [mail, setMail] = useState<MailAccount | null>(null);

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

  const sendingAddress = mail?.user?.trim() || "";
  const shownEmail = sendingAddress || user?.email || currentUser.email;
  const shownName = user?.name || currentUser.name;
  const shownInitials = user?.initials || currentUser.initials;

  const handleConfirmLogout = () => {
    setLogoutConfirmOpen(false);
    logout();
    navigate("/login");
  };

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

      {/* Navigation links with vibrant colorful icon badges */}
      <nav className="flex flex-1 flex-col gap-[3px] max-mob:flex-row max-mob:gap-[4px] max-mob:overflow-x-auto">
        {NAV.filter((n) => !n.hidden).map((n) => {
          const isActive = active.id === n.id;
          return (
            <NavLink
              key={n.id}
              to={n.path}
              title={collapsed ? n.label : undefined}
              className={cn(
                "group flex items-center rounded-[10px] text-left font-medium transition-all duration-200",
                "max-mob:whitespace-nowrap max-mob:px-[11px] max-mob:py-2",
                collapsed
                  ? "justify-center px-0 py-[7px]"
                  : "gap-[11px] px-2.5 py-[7px]",
                isActive
                  ? "bg-slate-100/90 font-bold text-slate-900 shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <span className={cn(
                "grid h-7 w-7 flex-none place-items-center rounded-lg transition-all duration-200",
                n.bgClass || "bg-slate-100",
                isActive ? "ring-1 ring-slate-900/10 shadow-xs scale-105" : "group-hover:scale-105"
              )}>
                <n.icon size={15} className={n.colorClass || "text-slate-600"} />
              </span>
              {!collapsed && <span className="text-[13px]">{n.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User profile info & controls */}
      <div className="flex flex-col gap-1 border-t border-line pt-3 max-mob:hidden">
        <div
          className={cn(
            "group flex items-center justify-between rounded-[9px] px-2 py-1.5 transition-colors text-ink",
            collapsed ? "justify-center px-0" : "gap-2"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="relative grid h-[34px] w-[34px] flex-none place-items-center rounded-full bg-indigo-50 text-[12px] font-bold text-indigo-600 ring-1 ring-indigo-200">
              {shownInitials}
              {sendingAddress && (
                <span
                  className="absolute -bottom-[1px] -right-[1px] h-[10px] w-[10px] rounded-full border-2 border-white bg-emerald-500"
                  aria-hidden
                />
              )}
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[13px] text-slate-900">{shownName}</b>
                <small className="block truncate text-[11px] text-slate-500">
                  {shownEmail}
                </small>
              </div>
            )}
          </div>

          {!collapsed && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMailOpen(true)}
                title={
                  sendingAddress
                    ? `Sending as ${sendingAddress} via Outlook`
                    : "Configure Outlook Mail"
                }
                className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-105 transition-all"
              >
                <Mail size={14} />
              </button>
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(true)}
                title="Sign Out"
                className="grid h-7 w-7 place-items-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:scale-105 transition-all"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {mailOpen && (
        <MailAccountModal
          onClose={() => setMailOpen(false)}
          onChange={setMail}
          initialUser={sendingAddress}
        />
      )}

      {/* Modern Confirmation Modal for Sign Out */}
      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-[360px] overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setLogoutConfirmOpen(false)}
              className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center text-center pt-2">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-8 ring-rose-50/50">
                <LogOut className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Sign Out of HR Portal?</h3>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed px-2">
                Are you sure you want to end your current session? You will need to log in again to access employee payroll.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(false)}
                className="flex-1 h-10 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 text-xs font-semibold text-white shadow-md shadow-rose-600/20 hover:from-rose-700 hover:to-rose-800 active:scale-[0.98] transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
