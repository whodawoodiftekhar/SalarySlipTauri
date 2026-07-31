import { Landmark, Loader2, Plus, User, Wallet, X } from "lucide-react";
import { useEffect, useState } from "react";
import { payrollService } from "@/features/payroll/services/payrollService";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { Button, IconButton } from "@/shared/components/ui/Button";
import { Field, FIELD_INPUT } from "@/shared/components/ui/Field";
import { Overlay } from "@/shared/components/ui/Overlay";
import { LOGO } from "@/shared/lib/branding";
import { inr, num } from "@/shared/lib/format";
import type { Employee, PayrollResult } from "@/shared/types";
import { employeeService } from "../services/employeeService";
import type { EmployeeFormState } from "../types";

export function AddEmployeeModal({
  saving,
  onCancel,
  onSave,
}: {
  saving: boolean;
  onCancel: () => void;
  onSave: (employee: Employee) => void;
}) {
  const { departments, company, payPeriod } = useSettings();

  const [f, setF] = useState<EmployeeFormState>({
    name: "",
    email: "",
    id: "",
    dept: departments[0] ?? "",
    role: "",
    basic: "",
    special: "",
    onsite: "",
    tds: "",
    bankName: "",
    bankAccountNo: "",
    pfAccountNo: "",
    pan: "",
    uan: "",
    doj: "",
    paymentMode: "Bank Transfer",
  });

  // the next free code is assigned by the API, not guessed in the browser
  useEffect(() => {
    let cancelled = false;
    employeeService.nextCode().then((code) => {
      if (!cancelled) setF((prev) => (prev.id ? prev : { ...prev, id: code }));
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

  // the estimate is computed by the API from the same engine payroll uses
  const seedKey = valid
    ? `${num(f.basic)}|${num(f.special)}|${num(f.onsite)}|${num(f.tds)}`
    : "";
  const [preview, setPreview] = useState<{
    key: string;
    result: PayrollResult;
  } | null>(null);

  useEffect(() => {
    if (!seedKey) return;
    let cancelled = false;

    // debounced so typing a salary doesn't fire a request per keystroke
    const timer = setTimeout(() => {
      const [basic, special, onsite, tds] = seedKey.split("|").map(Number);
      payrollService
        .preview({ basic, special, onsite, tds })
        .then((result) => {
          if (!cancelled) setPreview({ key: seedKey, result });
        })
        .catch(() => {
          /* the estimate is optional — the form still submits */
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [seedKey]);

  const save = () =>
    onSave({
      id: f.id.trim(),
      name: f.name.trim(),
      email: f.email.trim(),
      dept: f.dept,
      role: f.role.trim(),
      basic: num(f.basic),
      special: num(f.special),
      onsite: num(f.onsite),
      tds: num(f.tds),
      bankName: f.bankName.trim(),
      bankAccountNo: f.bankAccountNo.trim(),
      pfAccountNo: f.pfAccountNo.trim(),
      pan: f.pan.trim(),
      uan: f.uan.trim(),
      doj: f.doj.trim(),
      paymentMode: f.paymentMode.trim(),
    });

  return (
    <Overlay onClose={onCancel}>
      <div
        className="w-full max-w-[680px] max-h-[90vh] flex flex-col rounded-2xl bg-white p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)] max-mob:max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3.5">
          <div>
            <h3 className="m-0 text-[18px] font-bold text-ink">Add New Employee</h3>
            <p className="m-0 text-[12px] text-mist">
              Fill in personal details, banking info, and initial CTC.
            </p>
          </div>
          <IconButton onClick={onCancel} aria-label="Close">
            <X size={18} />
          </IconButton>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Section 1: Personal & Work Details */}
          <div className="rounded-xl border border-line bg-paper/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-[13.5px] font-bold text-ink">
              <User size={16} className="text-accent" /> Personal &amp; Work Details
            </div>
            <div className="grid grid-cols-2 gap-3.5 max-xs:grid-cols-1">
              <Field label="Full Name *">
                <input
                  className={FIELD_INPUT}
                  value={f.name}
                  onChange={set("name")}
                  placeholder="e.g. Priya Sharma"
                />
              </Field>
              <Field label="Email Address *">
                <input
                  type="email"
                  className={FIELD_INPUT}
                  value={f.email}
                  onChange={set("email")}
                  placeholder="e.g. priya.sharma@comm-it.com"
                />
              </Field>
              <Field label="Employee Code *">
                <input className={FIELD_INPUT} value={f.id} onChange={set("id")} />
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

          {/* Section 2: Banking & PF Details */}
          <div className="rounded-xl border border-line bg-paper/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-[13.5px] font-bold text-ink">
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

          {/* Section 3: Salary Components */}
          <div className="rounded-xl border border-line bg-paper/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-[13.5px] font-bold text-ink">
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
              <Field label="Onsite Incentive">
                <input
                  className={FIELD_INPUT}
                  type="number"
                  value={f.onsite}
                  onChange={set("onsite")}
                  placeholder="0"
                />
              </Field>
              <Field label="TDS (Monthly Deduction)">
                <input
                  className={FIELD_INPUT}
                  type="number"
                  value={f.tds}
                  onChange={set("tds")}
                  placeholder="0"
                />
              </Field>
            </div>

            <p className="mt-3 text-[11.5px] leading-relaxed text-mist">
              * HRA, Transport, Medical, PF, and Professional Tax will be attached automatically based on default company structure.
            </p>
          </div>

          {/* Exact Payslip Card Preview matching Image */}
          {valid && preview?.key === seedKey && (
            <div className="rounded-xl border border-line bg-white p-5 shadow-sm space-y-3.5">
              {/* Logo & Company Header */}
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

              {/* Title */}
              <div className="text-center text-[12px] font-bold uppercase tracking-[0.06em] text-ink">
                PAY SLIP — {payPeriod}
              </div>

              {/* Employee Meta Grid */}
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
                  <span className="text-[11px] uppercase tracking-wider text-ash">DAYS PAYABLE</span>
                  <b className="text-right text-ink font-semibold">30 / 30</b>
                </div>
              </div>

              {/* Earnings & Deductions Columns */}
              <div className="grid grid-cols-2 pt-1">
                {/* Earnings */}
                <div className="pr-3 border-r border-line space-y-1.5">
                  <div className="mb-2 border-b border-line pb-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-earn">
                    EARNINGS
                  </div>
                  {preview.result.earnings.map((e) => (
                    <div key={e.id} className="flex justify-between text-[12.5px]">
                      <span className="text-ash">{e.name}</span>
                      <b className="font-mono font-semibold tabular-nums text-ink">{inr(e.amount)}</b>
                    </div>
                  ))}
                </div>

                {/* Deductions */}
                <div className="pl-3 space-y-1.5">
                  <div className="mb-2 border-b border-line pb-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-deduct">
                    DEDUCTIONS
                  </div>
                  {preview.result.deductions.map((d) => (
                    <div key={d.id} className="flex justify-between text-[12.5px]">
                      <span className="text-ash">{d.name}</span>
                      <b className="font-mono font-semibold tabular-nums text-ink">{inr(d.amount)}</b>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="flex flex-col gap-1.5 border-t border-line pt-3 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-ash">Gross (A)</span>
                  <b className="font-mono tabular-nums text-earn font-bold">{inr(preview.result.gross)}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-ash">Deductions (B)</span>
                  <b className="font-mono tabular-nums text-deduct font-bold">
                    {inr(preview.result.totalDeductions)}
                  </b>
                </div>
              </div>

              {/* Net Salary Dark Pill */}
              <div className="flex items-center justify-between rounded-xl bg-ink px-4 py-3.5 text-white">
                <span className="text-[10.5px] uppercase tracking-[0.1em] opacity-70">
                  NET SALARY
                </span>
                <div className="font-mono text-[22px] font-bold tracking-[-0.01em] tabular-nums text-white">
                  ₹ {inr(preview.result.net)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-5 flex items-center justify-end gap-3 border-t border-line pt-4">
          <Button variant="overlayGhost" onClick={onCancel} disabled={saving}>
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
      </div>
    </Overlay>
  );
}
