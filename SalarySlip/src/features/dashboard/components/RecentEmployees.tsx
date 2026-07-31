import { ChevronRight, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@/shared/components/ui/Avatar";
import { DeptTag } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { initials, inr0 } from "@/shared/lib/format";
import type { RosterEntry } from "@/shared/types";

export function RecentEmployees({ roster }: { roster: RosterEntry[] }) {
  const navigate = useNavigate();
  const recent = roster.slice(0, 5);

  return (
    <Card className="flex flex-col justify-between">
      <div>
        <CardHeader>
          <div>
            <CardTitle>Recent employees</CardTitle>
            <p className="mt-0.5 text-[12px] text-mist">Newly added roster members</p>
          </div>
          <Button variant="link" onClick={() => navigate("/employees")}>
            View all <ChevronRight size={13} />
          </Button>
        </CardHeader>

        <div className="flex flex-col space-y-1 mt-1">
          {recent.map((e) => (
            <div
              key={e.id}
              onClick={() => navigate(`/payroll/${e.id}`)}
              className="group flex items-center justify-between rounded-xl p-2.5 transition-all hover:bg-paper cursor-pointer border border-transparent hover:border-line"
            >
              <div className="flex items-center gap-3">
                <Avatar label={initials(e.name)} size="sm" />
                <div>
                  <div className="flex items-center gap-2">
                    <b className="text-[13.5px] text-ink group-hover:text-accent transition-colors">
                      {e.name}
                    </b>
                    <small className="font-mono text-[11px] text-ash bg-paper px-1.5 py-0.5 rounded border border-hairline">
                      {e.id}
                    </small>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <small className="text-[11.5px] text-mist">{e.role}</small>
                    <DeptTag dept={e.dept} />
                  </div>
                </div>
              </div>

              <div className="text-right flex items-center gap-2">
                <div>
                  <b className="font-mono tabular-nums text-earn text-[13.5px] block">
                    ₹{inr0(e.net)}
                  </b>
                  <small className="text-[10.5px] text-ash block">Net / mo</small>
                </div>
                <ArrowUpRight
                  size={15}
                  className="text-ash opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-3 text-center">
        <button
          onClick={() => navigate("/employees/new")}
          className="text-[12.5px] font-bold text-accent hover:underline border-none bg-transparent cursor-pointer"
        >
          + Add another employee to roster
        </button>
      </div>
    </Card>
  );
}
