import { ArrowLeft, Landmark, Loader2, Plus, User, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { Field, FIELD_INPUT } from "@/shared/components/ui/Field";
import { PasswordInput } from "@/shared/components/ui/PasswordInput";
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
  const { departments, company } = useSettings();
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
    ifsc: "",
    pan: "",
    uan: "",
    doj: "",
    paymentMode: "Bank Transfer",
    pdfPassword: "",
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
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setSubmitError(null);
      setF((prev) => ({ ...prev, [k]: e.target.value }));
    };

  const [salaryInputs, setSalaryInputs] = useState<Record<string, string>>({});

  const handleSalaryChange = (key: string, value: string) => {
    setSubmitError(null);
    setSalaryInputs((prev) => ({ ...prev, [key]: value }));
    if (key in f) {
      setF((prev) => ({ ...prev, [key]: value }));
    }
  };

  const handleInputFocus = (
    key: string,
    val: any,
    e: React.FocusEvent<HTMLInputElement>,
  ) => {
    if (val === 0 || val === "0") {
      handleSalaryChange(key, "");
    } else {
      e.target.select();
    }
  };

  const handleInputBlur = (key: string, val: any) => {
    if (val === "" || val === undefined || val === null) {
      handleSalaryChange(key, "0");
    }
  };

  const isDeductionItem = (item: any) => {
    const g = String(item.group || item.type || "").toLowerCase();
    if (g === "deduction") return true;
    const key = String(item.code || item.name || "").toLowerCase();
    return ["pf", "tds", "advance", "insurance", "pt", "esi"].some((d) =>
      key.includes(d),
    );
  };

  const seedObj = useMemo(() => {
    const obj: Record<string, number> = {};
    if (catalogItems.length > 0) {
      catalogItems.forEach((item) => {
        const codeKey = (item.code || item.name || "").toLowerCase();
        const val = salaryInputs[codeKey] ?? (f as any)[codeKey];
        if (val !== undefined && val !== "") {
          obj[codeKey] = num(val);
        }
      });
    } else {
      Object.entries(salaryInputs).forEach(([k, v]) => {
        if (v !== "") obj[k] = num(v);
      });
    }
    return obj;
  }, [salaryInputs, f, catalogItems]);

  const valid = Boolean(
    f.name.trim() &&
      f.role.trim() &&
      f.email.trim(),
  );

  const previewResult = compute(makeStructure(seedObj, catalogItems), 30, 30);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const getErrorMessage = (err: unknown): string => {
    if (err && typeof err === "object" && "body" in err && typeof (err as any).body === "string") {
      try {
        const parsed = JSON.parse((err as any).body);
        if (parsed && parsed.message) return parsed.message;
      } catch {}
    }
    if (err instanceof Error) return err.message;
    return String(err || "Failed to submit employee data");
  };

  const save = async () => {
    setSubmitError(null);
    try {
      const finalId = f.id.trim() || autoCode;
      const employee = await addEmployee({
        id: finalId,
        name: f.name.trim(),
        email: f.email.trim(),
        dept: f.dept,
        role: f.role.trim(),
        basic: num(salaryInputs["basic"] ?? f.basic),
        special: num(salaryInputs["special"] ?? f.special),
        onsite: num(salaryInputs["onsite"] ?? f.onsite),
        transport: num(salaryInputs["transport"] ?? f.transport),
        projectAllowance: num(salaryInputs["projectAllowance"] ?? f.projectAllowance),
        lta: num(salaryInputs["lta"] ?? f.lta),
        medical: num(salaryInputs["medical"] ?? f.medical),
        pf: num(salaryInputs["pf"] ?? f.pf),
        tds: num(salaryInputs["tds"] ?? f.tds),
        ...seedObj,
        bankName: f.bankName.trim(),
        bankAccountNo: f.bankAccountNo.trim(),
        pfAccountNo: f.pfAccountNo.trim(),
        ifsc: f.ifsc.trim(),
        pan: f.pan.trim(),
        uan: f.uan.trim(),
        doj: f.doj.trim(),
        // trimmed because a stray space would be invisible in the covering mail
        pdfPassword: f.pdfPassword.trim(),
        paymentMode: f.paymentMode.trim(),
      });
      if (employee && employee.id) {
        navigate(`/payroll/${employee.id}`);
      }
    } catch (err) {
      console.error("Failed to add employee:", err);
      setSubmitError(getErrorMessage(err));
    }
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
              <Field label="PDF Password">
                <PasswordInput
                  value={f.pdfPassword}
                  onChange={set("pdfPassword")}
                  placeholder="Leave blank for no protection"
                />
              </Field>
            </div>
          </div>

          {/* Section 2: Banking & PF */}
          <div className="rounded-xl border border-line bg-paper/50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
              <Landmark size={16} className="text-accent" /> Banking &amp; PF Accounts
            </div>
            <div className="grid grid-cols-2 gap-3.5 max-xs:grid-cols-1">
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
              <Field label="IFSC Code">
                <input
                  className={FIELD_INPUT}
                  value={f.ifsc}
                  onChange={set("ifsc")}
                  placeholder="e.g. HDFC0001234"
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

            {catalogItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-white/70 p-5 text-center space-y-2">
                <p className="m-0 text-[13px] text-ash font-medium">
                  No salary components found in catalog.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-accent"
                  onClick={() => navigate("/components")}
                >
                  + Add components in Catalog
                </Button>
              </div>
            ) : (
              <>
                {/* Earnings Sub-grid */}
                {catalogItems.some((item) => !isDeductionItem(item)) && (
                  <div>
                    <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-2">
                      Earnings
                    </div>
                    <div className="grid grid-cols-2 gap-3.5 max-xs:grid-cols-1">
                      {catalogItems
                        .filter((item) => !isDeductionItem(item))
                        .map((item) => {
                          const codeKey = (item.code || item.name || "").toLowerCase();
                          const isBasic = codeKey === "basic" || item.name.toLowerCase().includes("basic");
                          const rawVal = salaryInputs[codeKey] ?? (f as any)[codeKey] ?? "";
                          const isAutoPct = item.calc && (item.calc.includes("%") || item.calc.includes("statutory"));

                          return (
                            <Field key={item.code || item.name} label={`${item.name}${isBasic ? " *" : ""}`}>
                              <input
                                className={FIELD_INPUT}
                                type="number"
                                value={rawVal}
                                onFocus={(e) => handleInputFocus(codeKey, rawVal, e)}
                                onBlur={() => handleInputBlur(codeKey, rawVal)}
                                onChange={(e) => handleSalaryChange(codeKey, e.target.value)}
                                placeholder={isAutoPct ? `Auto (${item.calc})` : "0"}
                              />
                            </Field>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Deductions Sub-grid */}
                {catalogItems.some((item) => isDeductionItem(item)) && (
                  <div>
                    <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider mb-2">
                      Deductions
                    </div>
                    <div className="grid grid-cols-2 gap-3.5 max-xs:grid-cols-1">
                      {catalogItems
                        .filter((item) => isDeductionItem(item))
                        .map((item) => {
                          const codeKey = (item.code || item.name || "").toLowerCase();
                          const rawVal = salaryInputs[codeKey] ?? (f as any)[codeKey] ?? "";
                          const isAutoPct = item.calc && (item.calc.includes("%") || item.calc.includes("statutory"));

                          return (
                            <Field key={item.code || item.name} label={item.name}>
                              <input
                                className={FIELD_INPUT}
                                type="number"
                                value={rawVal}
                                onFocus={(e) => handleInputFocus(codeKey, rawVal, e)}
                                onBlur={() => handleInputBlur(codeKey, rawVal)}
                                onChange={(e) => handleSalaryChange(codeKey, e.target.value)}
                                placeholder={isAutoPct ? `Auto (${item.calc})` : "0"}
                              />
                            </Field>
                          );
                        })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {submitError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-[13px] font-medium text-red-700">
              ⚠️ {submitError}
            </div>
          )}

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

            <div className="grid grid-cols-2 gap-x-5 gap-y-2 border-b border-line pb-3.5 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[11px] uppercase tracking-wider text-ash">EMPLOYEE</span>
                <b className="text-right text-ink font-semibold">{f.name || "—"}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] uppercase tracking-wider text-ash">BANK NAME</span>
                <b className="text-right text-ink font-semibold">{f.bankName || "—"}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] uppercase tracking-wider text-ash">CODE</span>
                <b className="text-right text-ink font-semibold">{f.id || "—"}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] uppercase tracking-wider text-ash">IFSC CODE</span>
                <b className="text-right text-ink font-semibold">{f.ifsc || "—"}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] uppercase tracking-wider text-ash">DESIGNATION</span>
                <b className="text-right text-ink font-semibold">{f.role || "—"}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] uppercase tracking-wider text-ash">BANK ACCOUNT</span>
                <b className="text-right text-ink font-semibold">{f.bankAccountNo || "—"}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] uppercase tracking-wider text-ash">DEPARTMENT</span>
                <b className="text-right text-ink font-semibold">{f.dept || "—"}</b>
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
