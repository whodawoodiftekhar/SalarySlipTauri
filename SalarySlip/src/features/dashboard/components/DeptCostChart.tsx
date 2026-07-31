import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { CHART_COLORS } from "@/shared/lib/branding";
import { inr0 } from "@/shared/lib/format";
import type { RosterEntry } from "@/shared/types";

interface DeptCost {
  dept: string;
  cost: number;
  count: number;
}

export function DeptCostChart({
  roster,
}: {
  roster: RosterEntry[];
}) {
  const byDept: DeptCost[] = Object.values(
    roster.reduce<Record<string, DeptCost>>((a, e) => {
      a[e.dept] = a[e.dept] ?? { dept: e.dept, cost: 0, count: 0 };
      a[e.dept].cost += e.net;
      a[e.dept].count += 1;
      return a;
    }, {}),
  );

  return (
    <Card className="flex flex-col justify-between">
      <div>
        <CardHeader>
          <div>
            <CardTitle>Payroll cost by department</CardTitle>
            <p className="mt-0.5 text-[12.5px] text-mist">
              Departmental salary breakdown across roster
            </p>
          </div>
        </CardHeader>

        <div className="h-64 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byDept} margin={{ top: 12, right: 12, left: 12, bottom: 0 }}>
              <XAxis
                dataKey="dept"
                tickLine={false}
                axisLine={{ stroke: "#E6E9EF" }}
                tick={{ fontSize: 12.5, fontWeight: 600, fill: "#2D3748" }}
              />
              <YAxis
                tickFormatter={(v: number) => `₹${v / 1000}k`}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#718096" }}
                width={52}
              />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.03)" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as DeptCost;
                    return (
                      <div className="rounded-xl border border-line bg-white p-3 shadow-lg text-[12px] space-y-1">
                        <b className="text-ink text-[13px] block">{data.dept} Department</b>
                        <div className="text-ash">Employees: <b className="text-ink">{data.count}</b></div>
                        <div className="text-ash">Total Net: <b className="text-earn">₹{inr0(data.cost)}</b></div>
                        <div className="text-ash">Average: <b className="text-ink">₹{inr0(Math.round(data.cost / (data.count || 1)))}</b></div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="cost" radius={[8, 8, 0, 0]} maxBarSize={56}>
                {byDept.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-3.5 flex flex-wrap items-center justify-around gap-2 text-[12px]">
        {byDept.map((d, i) => (
          <div key={d.dept} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="text-ash font-medium">{d.dept}:</span>
            <b className="text-ink font-semibold tabular-nums">₹{inr0(d.cost)}</b>
            <span className="text-mist text-[11px]">({d.count})</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
