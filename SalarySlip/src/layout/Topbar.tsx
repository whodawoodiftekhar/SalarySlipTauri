import { Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { Button } from "@/shared/components/ui/Button";
import { DbStatusBadge } from "@/shared/components/DbStatusBanner";
import { matchNav } from "./navigation";

export function Topbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { payPeriod } = useSettings();

  return (
    <header className="sticky top-0 z-[5] flex items-center justify-between border-b border-line bg-white px-7 py-[18px] max-mob:static max-mob:px-4 max-mob:py-[14px]">
      <h1 className="m-0 text-[20px] font-[650] tracking-[-0.02em] max-mob:text-[18px]">
        {matchNav(pathname).label}
      </h1>
      <div className="flex items-center gap-3">
        <DbStatusBadge />
        <span className="rounded-lg border border-line bg-hover px-3 py-[7px] text-[13px] font-semibold">
          {payPeriod}
        </span>
        <Button onClick={() => navigate("/employees")}>
          <Plus size={15} /> Run payroll
        </Button>
      </div>
    </header>
  );
}
