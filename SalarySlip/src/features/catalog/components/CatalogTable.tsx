import { Badge } from "@/shared/components/ui/Badge";
import type { CatalogItem } from "@/shared/types";

const TH =
  "border-b border-line px-3 pb-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-mist";
const TD = "border-b border-hairline p-3 align-middle text-[13.5px]";

export function CatalogTable({ items }: { items: CatalogItem[] }) {
  return (
    <table className="w-full border-collapse max-mob:min-w-[560px]">
      <thead>
        <tr>
          <th className={TH}>Code</th>
          <th className={TH}>Name</th>
          <th className={TH}>Group</th>
          <th className={TH}>Calculation</th>
          <th className={TH}>Taxable</th>
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
          </tr>
        ))}
      </tbody>
    </table>
  );
}
