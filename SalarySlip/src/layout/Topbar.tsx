import { useLocation } from "react-router-dom";
import { BackendStatusBadge, DbStatusBadge } from "@/shared/components/DbStatusBanner";
import { matchNav } from "./navigation";

export function Topbar() {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-[50] flex items-center justify-between border-b border-line bg-white px-7 py-[18px] max-mob:static max-mob:px-4 max-mob:py-[14px]">
      <h1 className="m-0 text-[20px] font-[650] tracking-[-0.02em] max-mob:text-[18px]">
        {matchNav(pathname).label}
      </h1>
      <div className="flex items-center gap-3">
        <BackendStatusBadge />
        <DbStatusBadge />
      </div>
    </header>
  );
}

