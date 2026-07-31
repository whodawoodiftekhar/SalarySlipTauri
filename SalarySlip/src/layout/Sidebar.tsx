import { NavLink, useLocation } from "react-router-dom";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { LOGO } from "@/shared/lib/branding";
import { cn } from "@/shared/lib/cn";
import { matchNav, NAV } from "./navigation";

export function Sidebar() {
  const { company, currentUser } = useSettings();
  const { pathname } = useLocation();
  const active = matchNav(pathname);

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen w-[236px] flex-col border-r border-line bg-white px-[14px] py-[18px]",
        "max-mob:z-20 max-mob:h-auto max-mob:w-full max-mob:flex-row max-mob:items-center max-mob:gap-[6px] max-mob:overflow-x-auto max-mob:px-3 max-mob:py-[10px]",
      )}
    >
      <div className="flex flex-col gap-[3px] px-2 pb-[18px] pt-1 max-mob:mr-[6px] max-mob:flex-none max-mob:p-0">
        <img
          src={company.logoUrl || LOGO}
          alt={company.name}
          className="h-8 w-auto max-h-8 object-contain max-mob:h-[26px]"
        />

        <small className="text-[11px] text-mist max-mob:hidden">
          Payroll · HR
        </small>
      </div>

      <nav className="flex flex-1 flex-col gap-[2px] max-mob:flex-row max-mob:gap-[4px] max-mob:overflow-x-auto">
        {NAV.map((n) => (
          <NavLink
            key={n.id}
            to={n.path}
            className={cn(
              "flex items-center gap-[11px] rounded-[9px] px-3 py-[10px] text-left font-medium",
              "max-mob:whitespace-nowrap max-mob:px-[11px] max-mob:py-2",
              active.id === n.id
                ? "bg-accent-soft font-semibold text-accent"
                : "text-ash hover:bg-hover hover:text-ink",
            )}
          >
            <n.icon size={17} /> {n.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-[10px] border-t border-line px-2 pb-1 pt-3 max-mob:hidden">
        <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-full bg-accent-soft text-[12px] font-bold text-accent">
          {currentUser.initials}
        </span>
        <div>
          <b className="block text-[13px]">{currentUser.name}</b>
          <small className="text-[11px] text-mist">{currentUser.email}</small>
        </div>
      </div>
    </aside>
  );
}
