import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { BackendStatusBadge, DbStatusBadge } from "@/shared/components/DbStatusBanner";
import { matchNav } from "./navigation";

export function Topbar() {
  const { pathname, key } = useLocation();
  const navigate = useNavigate();
  const active = matchNav(pathname);

  /**
   * Pages kept out of the sidebar have no other way back, so they get an arrow.
   * A page opened straight from the address bar has no in-app history to pop —
   * router keys that entry "default" — so that case lands on the pay run.
   */
  const goBack = () => (key === "default" ? navigate("/pay-run") : navigate(-1));

  return (
    <header className="sticky top-0 z-[50] flex items-center justify-between border-b border-line bg-white px-7 py-[18px] max-mob:static max-mob:px-4 max-mob:py-[14px]">
      <div className="flex items-center gap-2.5">
        {active.hidden && (
          <button
            className="grid place-items-center rounded-lg border border-line bg-white p-[7px] text-ash hover:border-accent-ring hover:bg-accent-soft hover:text-accent cursor-pointer"
            onClick={goBack}
            title="Back"
            aria-label="Go back"
          >
            <ArrowLeft size={17} />
          </button>
        )}
        <h1 className="m-0 text-[20px] font-[650] tracking-[-0.02em] max-mob:text-[18px]">
          {active.label}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <BackendStatusBadge />
        <DbStatusBadge />
      </div>
    </header>
  );
}

