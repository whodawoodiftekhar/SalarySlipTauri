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
}

export function DeptCostChart({
  roster,
  period,
}: {
  roster: RosterEntry[];
  period: string;
}) {
  const byDept: DeptCost[] = Object.values(
    roster.reduce<Record<string, DeptCost>>((a, e) => {
      a[e.dept] = a[e.dept] ?? { dept: e.dept, cost: 0 };
      a[e.dept].cost += e.net;
      return a;
    }, {}),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payroll cost by department</CardTitle>
        <small className="text-[12px] text-mist">Net · {period}</small>
      </CardHeader>
      <div className="h-60">
        <ResponsiveContainer>
          <BarChart data={byDept} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <XAxis
              dataKey="dept"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "#5C6675" }}
            />
            <YAxis
              tickFormatter={(v: number) => `${v / 1000}k`}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#9AA3B0" }}
              width={40}
            />
            <Tooltip
              cursor={{ fill: "#F1F3F7" }}
              formatter={(v) => [`₹${inr0(Number(v))}`, "Net"]}
              contentStyle={{
                borderRadius: 10,
                border: "1px solid #E6E9EF",
                fontSize: 12,
              }}
            />
            <Bar dataKey="cost" radius={[6, 6, 0, 0]} maxBarSize={54}>
              {byDept.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
