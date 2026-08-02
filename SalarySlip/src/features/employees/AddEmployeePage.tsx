import { ArrowLeft, Landmark, Loader2, Plus, User, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { Field, FIELD_INPUT } from "@/shared/components/ui/Field";
import { LOGO } from "@/shared/lib/branding";
import { inr, num } from "@/shared/lib/format";
import { compute, makeStructure } from "@/shared/lib/calc";
import { useCatalog } from "@/features/catalog/hooks/useCatalog";
import { useEmployees } from "./hooks/useEmployees";
import { employeeService } from "./services/employeeService";
import type { EmployeeFormState } from "./types";

export default function AddEmployeePage() {
  const navigate = useNavigate();
  const { addEmployee, saving } = useEmployees();
  const { departments, company, payPeriod } = useSettings();
  const { items: catalogItems } = useCatalog();

  const [autoCode, setAutoCode] = useState("C11032");

  const [f, setF] = useState<EmployeeFormState>({
    name: "",
    email: "",
    id: "",
    dept: departments[0] ?? "",
    role: "",
    basic: "",
    special: "",
    onsite: "",
    transport: "",
    projectAllowance: "",
    lta: "",
    medical: "",
    pf: "",
    tds: "",
    bankName: "",
    bankAccountNo: "",
    pfAccountNo: "",
    pan: "",
    uan: "",
    doj: "",
    paymentMode: "Bank Transfer",
  });

  useEffect(() => {
    let cancelled = false;
    employeeService.nextCode().then((code) => {
      if (!cancelled && code) setAutoCode(code);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const set =
    (k: keyof EmployeeFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setF({ ...f, [k]: e.target.value });

  const valid = Boolean(f.name.trim() && f.role.trim() && f.email.trim() && num(f.basic) > 0);

  const previewResult = compute(
    makeStructure(
      {
        basic: num(f.basic),
        special: num(f.special),
        onsite: num(f.onsite),
        transport: num(f.transport),
        projectAllowance: num(f.projectAllowance),
        lta: num(f.lta),
        medical: num(f.medical),
        pf: num(f.pf),
        tds: num(f.tds),
      },
      catalogItems,
    ),
    30,
    30,
  );

  const save = async () => {
    const finalId = f.id.trim() || autoCode;
    const employee = await addEmployee({
      id: finalId,
      name: f.name.trim(),
      email: f.email.trim(),
      dept: f.dept,
      role: f.role.trim(),
      basic: num(f.basic),
      special: num(f.special),
      onsite: num(f.onsite),
      transport: num(f.transport),
      projectAllowance: num(f.projectAllowance),
      lta: num(f.lta),
      medical: num(f.medical),
      pf: num(f.pf),
      tds: num(f.tds),
      bankName: f.bankName.trim(),
      bankAccountNo: f.bankAccountNo.trim(),
      pfAccountNo: f.pfAccountNo.trim(),
      pan: f.pan.trim(),
      uan: f.uan.trim(),
      doj: f.doj.trim(),
      paymentMode: f.paymentMode.trim(),
    });
    navigate(`/payroll/${employee.id}`);
  };

  return (
    <>
      <button
        className="mb-4 inline-flex items-center gap-1.5 border-none bg-transparent text-[13px] font-semibold text-ash hover:text-ink cursor-pointer"
        onClick={() => navigate("/employees")}
      >
        <ArrowLeft size={15} /> Back to roster
      </button>

      <div className="grid grid-cols-[1.1fr_0.9fr] items-start gap-5 max-pay:grid-cols-1">
        <Card className="p-6 space-y-5">
          <div>
            <h2 className="m-0 text-[20px] font-bold text-ink">Add New Employee</h2>
            <p className="mt-1 text-[13px] text-mist">
              Fill in employee details, banking info, and initial salary structure.
            </p>
          </div>

          {/* Section 1: Personal & Work */}
          <div className="rounded-xl border border-line bg-paper/50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
              <User size={16} className="text-accent" /> Personal &amp; Work Details
            </div>
            <div className="grid grid-cols-2 gap-3.5 max-xs:grid-cols-1">
              <Field label="Full Name *">
                <input
                  className={FIELD_INPUT}
                  value={f.name}
                  onChange={set("name")}
                  placeholder="e.g. Name"
                />
              </Field>
              <Field label="Email Address *">
                <input
                  type="email"
                  className={FIELD_INPUT}
                  value={f.email}
                  onChange={set("email")}
                  placeholder="e.g. example@comm-it.com"
                />
              </Field>
              <Field label="Employee Code *">
                <input
                  className={FIELD_INPUT}
                  value={f.id}
                  onChange={set("id")}
                  placeholder={`e.g. ${autoCode}`}
                />
              </Field>
              <Field label="Department">
                <select className={FIELD_INPUT} value={f.dept} onChange={set("dept")}>
                  {departments.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </Field>
              <Field label="Designation *">
                <input
                  className={FIELD_INPUT}
                  value={f.role}
                  onChange={set("role")}
                  placeholder="e.g. Senior Software Engineer"
                />
              </Field>
            </div>
          </div>

          {/* Section 2: Banking & PF */}
          <div className="rounded-xl border border-line bg-paper/50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
              <Landmark size={16} className="text-accent" /> Banking &amp; PF Accounts
            </div>
            <div className="grid grid-cols-3 gap-3.5 max-xs:grid-cols-1">
              <Field label="Bank Name">
                <input
                  className={FIELD_INPUT}
                  value={f.bankName}
                  onChange={set("bankName")}
                  placeholder="e.g. HDFC Bank"
                />
              </Field>
              <Field label="Bank Account No.">
                <input
                  className={FIELD_INPUT}
                  value={f.bankAccountNo}
                  onChange={set("bankAccountNo")}
                  placeholder="Account number"
                />
              </Field>
              <Field label="PF Account No.">
                <input
                  className={FIELD_INPUT}
                  value={f.pfAccountNo}
                  onChange={set("pfAccountNo")}
                  placeholder="PF account number"
                />
              </Field>
            </div>
          </div>

          {/* Section 3: Monthly Salary Setup */}
          <div className="rounded-xl border border-line bg-paper/50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
              <Wallet size={16} className="text-accent" /> Monthly Salary Setup (₹)
            </div>
            <div className="grid grid-cols-2 gap-3.5 max-xs:grid-cols-1">
              <Field label="Basic Salary *">
                <input
                  className={FIELD_INPUT}
                  type="number"
                  value={f.basic}
                  onChange={set("basic")}
                  placeholder="0"
                />
              </Field>
              <Field label="Special Allowance">
                <input
                  className={FIELD_INPUT}
                  type="number"
                  value={f.special}
                  onChange={set("special")}
                  placeholder="0"
                />
              </Field>
              <Field label="Transport Allowance">
                <input
                  className={FIELD_INPUT}
                  type="number"
                  value={f.transport}
                  onChange={set("transport")}
                  placeholder="0"
                />
              </Field>
              <Field label="Project Allowance">
                <input
                  className={FIELD_INPUT}
                  type="number"
                  value={f.projectAllowance}
                  onChange={set("projectAllowance")}
                  placeholder="0"
                />
              </Field>
              <Field label="LTA (Leave Travel)">
                <input
                  className={FIELD_INPUT}
                  type="number"
                  value={f.lta}
                  onChange={set("lta")}
                  placeholder="0"
                />
              </Field>
              <Field label="Medical Allowance">
                <input
                  className={FIELD_INPUT}
                  type="number"
                  value={f.medical}
                  onChange={set("medical")}
                  placeholder="0"
                />
              </Field>
              <Field label="Onsite Incentive">
                <input
                  className={FIELD_INPUT}
                  type="number"
                  value={f.onsite}
                  onChange={set("onsite")}
                  placeholder="0"
                />
              </Field>
              <Field label="PF (Provident Fund)">
                <input
                  className={FIELD_INPUT}
                  type="number"
                  value={f.pf}
                  onChange={set("pf")}
                  placeholder="0"
                />
              </Field>
            </div>

            <p className="mt-3 text-[11.5px] leading-relaxed text-mist">
              * HRA and other components will be attached automatically based on your company structure.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
            <Button variant="overlayGhost" onClick={() => navigate("/employees")} disabled={saving}>
              Cancel
            </Button>
            <Button disabled={!valid || saving} onClick={save}>
              {saving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Plus size={15} />
              )}
              {saving ? "Saving…" : "Add & Open Payroll"}
            </Button>
          </div>
        </Card>

        {/* Live Payslip Card Preview */}
        <div className="sticky top-[92px]">
          <div className="rounded-xl border border-line bg-white p-5 shadow-sm space-y-3.5">
            <div className="flex items-center gap-3 border-b border-line pb-3.5">
              <img
                src={company.logoUrl || LOGO}
                alt={company.name}
                className="h-[30px] w-auto max-h-[30px] flex-none object-contain"
              />
              <div>
                <b className="text-[13px] font-bold text-ink block">{company.legalName}</b>
                <small className="block text-[11.5px] text-ash">
                  {company.addressShort}
                </small>
              </div>
            </div>

            <div className="text-center text-[12px] font-bold uppercase tracking-[0.06em] text-ink">
              PAY SLIP — {payPeriod}
            </div>

            <div className="grid grid-cols-2 gap-x-5 gap-y-2 border-b border-line pb-3.5 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[11px] uppercase tracking-wider text-ash">EMPLOYEE</span>
                <b className="text-right text-ink font-semibold">{f.name || "—"}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] uppercase tracking-wider text-ash">DESIGNATION</span>
                <b className="text-right text-ink font-semibold">{f.role || "—"}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] uppercase tracking-wider text-ash">CODE</span>
                <b className="text-right text-ink font-semibold">{f.id || "—"}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] uppercase tracking-wider text-ash">BANK NAME</span>
                <b className="text-right text-ink font-semibold">{f.bankName || "—"}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] uppercase tracking-wider text-ash">DEPARTMENT</span>
                <b className="text-right text-ink font-semibold">{f.dept || "—"}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] uppercase tracking-wider text-ash">BANK ACCOUNT</span>
                <b className="text-right text-ink font-semibold">{f.bankAccountNo || "—"}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] uppercase tracking-wider text-ash">DAYS PAYABLE</span>
                <b className="text-right text-ink font-semibold">30 / 30</b>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] uppercase tracking-wider text-ash">PF ACCOUNT</span>
                <b className="text-right text-ink font-semibold">{f.pfAccountNo || "—"}</b>
              </div>
            </div>

            <div className="grid grid-cols-2 pt-1">
              <div className="pr-3 border-r border-line space-y-1.5">
                <div className="mb-2 border-b border-line pb-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-earn">
                  EARNINGS
                </div>
                {previewResult.earnings.map((e) => (
                  <div key={e.id} className="flex justify-between text-[12.5px]">
                    <span className="text-ash">{e.name}</span>
                    <b className="font-mono font-semibold tabular-nums text-ink">{inr(e.amount)}</b>
                  </div>
                ))}
              </div>

              <div className="pl-3 space-y-1.5">
                <div className="mb-2 border-b border-line pb-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-deduct">
                  DEDUCTIONS
                </div>
                {previewResult.deductions.map((d) => (
                  <div key={d.id} className="flex justify-between text-[12.5px]">
                    <span className="text-ash">{d.name}</span>
                    <b className="font-mono font-semibold tabular-nums text-ink">{inr(d.amount)}</b>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 border-t border-line pt-3 text-[13px]">
              <div className="flex justify-between">
                <span className="text-ash">Gross (A)</span>
                <b className="font-mono tabular-nums text-earn font-bold">{inr(previewResult.gross)}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-ash">Deductions (B)</span>
                <b className="font-mono tabular-nums text-deduct font-bold">
                  {inr(previewResult.totalDeductions)}
                </b>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-ink px-4 py-3.5 text-white">
              <span className="text-[10.5px] uppercase tracking-[0.1em] opacity-70">
                NET SALARY
              </span>
              <div className="font-mono text-[22px] font-bold tracking-[-0.01em] tabular-nums text-white">
                ₹ {inr(previewResult.net)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
