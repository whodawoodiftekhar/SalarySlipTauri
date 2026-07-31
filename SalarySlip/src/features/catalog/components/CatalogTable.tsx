import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/Badge";
import type { CatalogItem } from "@/shared/types";

const TH =
  "border-b border-line px-3 pb-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-mist";
const TD = "border-b border-hairline p-3 align-middle text-[13.5px]";

export function CatalogTable({
  items,
  busy,
  onEdit,
  onDelete,
}: {
  items: CatalogItem[];
  busy?: boolean;
  onEdit?: (item: CatalogItem) => void;
  onDelete?: (item: CatalogItem) => void;
}) {
  return (
    <table className="w-full border-collapse max-mob:min-w-[560px]">
      <thead>
        <tr>
          <th className={TH}>Code</th>
          <th className={TH}>Name</th>
          <th className={TH}>Group</th>
          <th className={TH}>Calculation</th>
          <th className={TH}>Taxable</th>
          {(onEdit || onDelete) && <th className={`${TH} text-right`}>Actions</th>}
        </tr>
      </thead>
      <tbody className="[&>tr:last-child>td]:border-b-0">
        {items.map((c) => (
          <tr key={c.code}>
            <td className={`${TD} font-mono tabular-nums`}>{c.code}</td>
            <td className={TD}>
              <b>{c.name}</b>
            </td>
            <td className={TD}>
              <Badge group={c.group} />
            </td>
            <td className={TD}>{c.calc}</td>
            <td className={TD}>{c.taxable}</td>
            {(onEdit || onDelete) && (
              <td className={`${TD} text-right`}>
                <div className="inline-flex items-center gap-1 justify-end">
                  {onEdit && (
                    <button
                      className="grid place-items-center rounded-lg border-none bg-transparent p-1.5 text-ash hover:bg-paper hover:text-ink disabled:opacity-40 cursor-pointer"
                      onClick={() => onEdit(c)}
                      disabled={busy}
                      aria-label={`Edit ${c.name}`}
                      title="Edit component"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      className="grid place-items-center rounded-lg border-none bg-transparent p-1.5 text-danger hover:bg-deduct-soft disabled:opacity-40 cursor-pointer"
                      onClick={() => onDelete(c)}
                      disabled={busy}
                      aria-label={`Delete ${c.name}`}
                      title="Delete component"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
