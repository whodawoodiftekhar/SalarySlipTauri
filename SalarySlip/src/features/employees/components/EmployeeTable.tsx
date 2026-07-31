import { ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Avatar } from "@/shared/components/ui/Avatar";
import { DeptTag } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { initials, inr } from "@/shared/lib/format";
import type { RosterEntry } from "@/shared/types";

const TH =
  "border-b border-line px-3 pb-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-mist";
const TD = "border-b border-hairline p-3 align-middle text-[13.5px]";

export function EmployeeTable({
  rows,
  busy,
  onSelect,
  onEdit,
  onDelete,
}: {
  rows: RosterEntry[];
  busy: boolean;
  onSelect: (employee: RosterEntry) => void;
  onEdit?: (employee: RosterEntry) => void;
  onDelete: (employee: RosterEntry) => void;
}) {
  return (
    <table className="w-full border-collapse max-mob:min-w-[560px]">
      <thead>
        <tr>
          <th className={TH}>Employee</th>
          <th className={TH}>Code</th>
          <th className={TH}>Department</th>
          <th className={`${TH} text-right`}>Net (30 days)</th>
          <th className={TH} />
        </tr>
      </thead>
      <tbody className="[&>tr:last-child>td]:border-b-0">
        {rows.map((e) => (
          <tr key={e.id}>
            <td className={TD}>
              <div className="flex items-center gap-[10px]">
                <Avatar label={initials(e.name)} size="sm" />
                <div>
                  <b className="block">{e.name}</b>
                  <small className="text-[11.5px] text-mist">{e.role}</small>
                </div>
              </div>
            </td>
            <td className={`${TD} font-mono tabular-nums`}>{e.id}</td>
            <td className={TD}>
              <DeptTag dept={e.dept} />
            </td>
            <td className={`${TD} text-right font-mono tabular-nums text-earn`}>
              ₹{inr(e.net)}
            </td>
            <td className={`${TD} text-right`}>
              <div className="inline-flex items-center gap-1.5">
                <Button variant="ghost" onClick={() => onSelect(e)}>
                  Generate <ChevronRight size={14} />
                </Button>
                {onEdit && (
                  <button
                    className="grid place-items-center rounded-lg border-none bg-transparent p-1.5 text-ash hover:bg-paper hover:text-ink disabled:opacity-40 cursor-pointer"
                    onClick={() => onEdit(e)}
                    disabled={busy}
                    aria-label={`Edit ${e.name}`}
                    title="Edit employee profile"
                  >
                    <Pencil size={15} />
                  </button>
                )}
                <button
                  className="grid place-items-center rounded-lg border-none bg-transparent p-1.5 text-danger hover:bg-deduct-soft disabled:opacity-40 cursor-pointer"
                  onClick={() => onDelete(e)}
                  disabled={busy}
                  aria-label={`Delete ${e.name}`}
                  title="Delete employee"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
