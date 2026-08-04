import { Landmark, Loader2, Save, User, Wallet, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { Button, IconButton } from "@/shared/components/ui/Button";
import { Field, FIELD_INPUT } from "@/shared/components/ui/Field";
import { Overlay } from "@/shared/components/ui/Overlay";
import { num } from "@/shared/lib/format";
import type { RosterEntry, SalaryComponent } from "@/shared/types";
import { employeeService } from "../services/employeeService";
import type { UpdateEmployeeDto } from "../types";

export function EditEmployeeModal({
  employee,
  saving,
  onCancel,
  onSave,
}: {
  employee: RosterEntry;
  saving: boolean;
  onCancel: () => void;
  onSave: (patch: UpdateEmployeeDto) => Promise<void>;
}) {
  const { departments } = useSettings();

  const [f, setF] = useState({
    name: employee.name ?? "",
    email: employee.email ?? "",
    dept: employee.dept ?? departments[0] ?? "",
    role: employee.role ?? "",
    bankName: employee.bankName ?? "",
    bankAccountNo: employee.bankAccountNo ?? "",
    pfAccountNo: employee.pfAccountNo ?? "",
    pan: employee.pan ?? "",
    uan: employee.uan ?? "",
    doj: employee.doj ?? "",
    paymentMode: employee.paymentMode ?? "Bank Transfer",
  });

  // Initialize structure components directly from employee's active slip earnings & deductions
  const defaultComponents: SalaryComponent[] = [
    ...(employee.earnings || []),
    ...(employee.deductions || []),
  ];

  const [structureComponents, setStructureComponents] =
    useState<SalaryComponent[]>(defaultComponents);
  const [loadingStructure, setLoadingStructure] = useState(true);
  const [savingStructure, setSavingStructure] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoadingStructure(true);
    employeeService
      .getSalaryStructure(employee.id)
      .then((comps) => {
        if (isMounted && Array.isArray(comps) && comps.length > 0) {
          setStructureComponents(comps);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch employee salary structure:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingStructure(false);
      });

    return () => {
      isMounted = false;
    };
  }, [employee.id]);

  const set =
    (k: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setF({ ...f, [k]: e.target.value });

  const handleComponentChange = (id: string, val: string) => {
    setStructureComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, value: val } : c)),
    );
  };

  const handleInputFocus = (
    id: string,
    currentVal: number | string,
    e: React.FocusEvent<HTMLInputElement>,
  ) => {
    e.target.select();
    if (String(currentVal).trim() === "0" || num(currentVal) === 0) {
      handleComponentChange(id, "");
    }
  };

  const handleInputBlur = (id: string, currentVal: number | string) => {
    if (String(currentVal).trim() === "") {
      handleComponentChange(id, "0");
    }
  };

  const valid = Boolean(f.name.trim() && f.role.trim() && f.email.trim());

  const handleSave = async () => {
    setSavingStructure(true);
    try {
      // Find basic salary value from components if present
      const basicComp = structureComponents.find(
        (c) =>
          c.isBasic ||
          c.id === "basic" ||
          (c.name && c.name.toLowerCase().includes("basic")),
      );
      const basicVal = basicComp ? num(basicComp.value) : num(employee.basic);

      // Save employee profile fields
      await onSave({
        name: f.name.trim(),
        email: f.email.trim(),
        dept: f.dept,
        role: f.role.trim(),
        basic: basicVal,
        bankName: f.bankName.trim(),
        bankAccountNo: f.bankAccountNo.trim(),
        pfAccountNo: f.pfAccountNo.trim(),
        pan: f.pan.trim(),
        uan: f.uan.trim(),
        doj: f.doj.trim(),
        paymentMode: f.paymentMode.trim(),
      });

      // Save exact salary structure components
      if (structureComponents.length > 0) {
        const formattedComponents = structureComponents.map((c) => ({
          id: c.id,
          name: c.name,
          group: c.group,
          calc: c.calc,
          value: num(c.value),
          prorate: Boolean(c.prorate),
          fixed: Boolean(c.fixed),
          isBasic: Boolean(c.isBasic),
        }));
        await employeeService.updateSalaryStructure(
          employee.id,
          formattedComponents,
        );
      }
    } finally {
      setSavingStructure(false);
    }
  };

  const isSaving = saving || savingStructure;

  // Case-insensitive filtering for earnings and deductions
  const isDeduction = (c: SalaryComponent) =>
    String(c.group || "").toLowerCase().includes("deduct");
  const isEarning = (c: SalaryComponent) => !isDeduction(c);

  const earnings = structureComponents.filter(isEarning);
  const deductions = structureComponents.filter(isDeduction);

  return (
    <Overlay onClose={onCancel}>
      <div
        className="w-full max-w-[620px] rounded-2xl bg-white p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)] space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="m-0 text-[18px] font-bold text-ink">
              Edit Employee Profile
            </h3>
            <p className="mt-0.5 text-[12px] text-mist">
              Update {employee.name} ({employee.id}) profile, bank info, and
              salary setup.
            </p>
          </div>
          <IconButton onClick={onCancel} aria-label="Close">
            <X size={18} />
          </IconButton>
        </div>

        <div className="max-h-[70vh] overflow-y-auto space-y-4 pr-1">
          {/* Section 1: Personal & Work */}
          <div className="rounded-xl border border-line bg-paper/50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-[13px] font-bold text-ink">
              <User size={15} className="text-accent" /> Personal &amp; Work
              Details
            </div>
            <div className="grid grid-cols-2 gap-3 max-xs:grid-cols-1">
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
              <Field label="Employee Code">
                <input
                  className={`${FIELD_INPUT} bg-paper text-ash cursor-not-allowed`}
                  value={employee.id}
                  disabled
                />
              </Field>
              <Field label="Department">
                <select
                  className={FIELD_INPUT}
                  value={f.dept}
                  onChange={set("dept")}
                >
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
            <div className="flex items-center gap-2 text-[13px] font-bold text-ink">
              <Landmark size={15} className="text-accent" /> Banking &amp; PF
              Accounts
            </div>
            <div className="grid grid-cols-3 gap-3 max-xs:grid-cols-1">
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[13px] font-bold text-ink">
                <Wallet size={15} className="text-accent" /> Monthly Salary Setup
                (₹)
              </div>
              <span className="text-[11px] text-mist font-medium">
                Active components in generated slip
              </span>
            </div>

            {structureComponents.length === 0 ? (
              <div className="text-[13px] text-mist py-2">
                No custom components found. Edit salary directly on the Generate
                Slip page.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Earnings Sub-grid */}
                {earnings.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-2">
                      Earnings
                    </div>
                    <div className="grid grid-cols-2 gap-3 max-xs:grid-cols-1">
                      {earnings.map((comp) => (
                        <Field
                          key={comp.id}
                          label={`${comp.name}${comp.isBasic || comp.id === "basic" ? " *" : ""}`}
                        >
                          <input
                            className={FIELD_INPUT}
                            type="number"
                            value={comp.value ?? 0}
                            onFocus={(e) =>
                              handleInputFocus(comp.id, comp.value ?? 0, e)
                            }
                            onBlur={() =>
                              handleInputBlur(comp.id, comp.value ?? 0)
                            }
                            onChange={(e) =>
                              handleComponentChange(comp.id, e.target.value)
                            }
                            placeholder="0"
                          />
                        </Field>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deductions Sub-grid */}
                {deductions.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider mb-2">
                      Deductions
                    </div>
                    <div className="grid grid-cols-2 gap-3 max-xs:grid-cols-1">
                      {deductions.map((comp) => (
                        <Field key={comp.id} label={comp.name}>
                          <input
                            className={FIELD_INPUT}
                            type="number"
                            value={comp.value ?? 0}
                            onFocus={(e) =>
                              handleInputFocus(comp.id, comp.value ?? 0, e)
                            }
                            onBlur={() =>
                              handleInputBlur(comp.id, comp.value ?? 0)
                            }
                            onChange={(e) =>
                              handleComponentChange(comp.id, e.target.value)
                            }
                            placeholder="0"
                          />
                        </Field>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-line pt-3.5">
          <Button variant="overlayGhost" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button disabled={!valid || isSaving} onClick={handleSave}>
            {isSaving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            {isSaving ? "Saving Changes…" : "Save Profile Changes"}
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
