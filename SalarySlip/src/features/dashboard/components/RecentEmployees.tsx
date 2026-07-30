import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { initials, inr0 } from "@/shared/lib/format";
import type { RosterEntry } from "@/shared/types";

export function RecentEmployees({ roster }: { roster: RosterEntry[] }) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent employees</CardTitle>
        <Button variant="link" onClick={() => navigate("/employees")}>
          View all <ChevronRight size={13} />
        </Button>
      </CardHeader>
      <div className="flex flex-col">
        {roster.slice(0, 5).map((e) => (
          <div
            key={e.id}
            className="flex items-center gap-[11px] border-b border-hairline py-[9px] last:border-b-0"
          >
            <Avatar label={initials(e.name)} size="sm" />
            <div className="flex-1">
              <b className="block text-[13.5px]">{e.name}</b>
              <small className="text-[11.5px] text-mist">{e.role}</small>
            </div>
            <b className="font-mono tabular-nums text-earn">₹{inr0(e.net)}</b>
          </div>
        ))}
      </div>
    </Card>
  );
}
