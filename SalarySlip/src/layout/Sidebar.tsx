import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { LOGO } from "@/shared/lib/branding";
import { cn } from "@/shared/lib/cn";
import { matchNav, NAV } from "./navigation";

export function Sidebar() {
  const { company, currentUser } = useSettings();
  const { pathname } = useLocation();
  const active = matchNav(pathname);
  const [collapsed, setCollapsed] = useState(false);

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
        {NAV.map((n) => (
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

      {/* User info */}
      <div className={cn(
        "flex items-center border-t border-line pb-1 pt-3 max-mob:hidden",
        collapsed ? "justify-center px-0" : "gap-[10px] px-2",
      )}>
        <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-full bg-accent-soft text-[12px] font-bold text-accent">
          {currentUser.initials}
        </span>
        {!collapsed && (
          <div>
            <b className="block text-[13px]">{currentUser.name}</b>
            <small className="text-[11px] text-mist">{currentUser.email}</small>
          </div>
        )}
      </div>
    </aside>
  );
}
