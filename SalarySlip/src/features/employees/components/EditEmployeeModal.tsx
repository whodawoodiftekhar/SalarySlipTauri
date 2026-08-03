import { Landmark, Loader2, Save, User, Wallet, X } from "lucide-react";
import { useState } from "react";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { Button, IconButton } from "@/shared/components/ui/Button";
import { Field, FIELD_INPUT } from "@/shared/components/ui/Field";
import { Overlay } from "@/shared/components/ui/Overlay";
import { num } from "@/shared/lib/format";
import type { RosterEntry } from "@/shared/types";
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
    basic: String(employee.basic ?? 0),
    special: String(employee.special ?? 0),
    onsite: String(employee.onsite ?? 0),
    transport: String(employee.transport ?? 0),
    projectAllowance: String(employee.projectAllowance ?? 0),
    lta: String(employee.lta ?? 0),
    medical: String(employee.medical ?? 0),
    pf: String(employee.pf ?? 0),
    tds: String(employee.tds ?? 0),
    bankName: employee.bankName ?? "",
    bankAccountNo: employee.bankAccountNo ?? "",
    pfAccountNo: employee.pfAccountNo ?? "",
    pan: employee.pan ?? "",
    uan: employee.uan ?? "",
    doj: employee.doj ?? "",
    paymentMode: employee.paymentMode ?? "Bank Transfer",
  });

  const set =
    (k: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setF({ ...f, [k]: e.target.value });

  const valid = Boolean(f.name.trim() && f.role.trim() && f.email.trim());

  const handleSave = async () => {
    await onSave({
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
  };

  return (
    <Overlay onClose={onCancel}>
      <div
        className="w-full max-w-[620px] rounded-2xl bg-white p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)] space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="m-0 text-[18px] font-bold text-ink">Edit Employee Profile</h3>
            <p className="mt-0.5 text-[12px] text-mist">
              Update {employee.name} ({employee.id}) profile, bank info, and salary setup.
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
              <User size={15} className="text-accent" /> Personal &amp; Work Details
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
            <div className="flex items-center gap-2 text-[13px] font-bold text-ink">
              <Landmark size={15} className="text-accent" /> Banking &amp; PF Accounts
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
            <div className="flex items-center gap-2 text-[13px] font-bold text-ink">
              <Wallet size={15} className="text-accent" /> Monthly Salary Setup (₹)
            </div>
            <div className="grid grid-cols-2 gap-3 max-xs:grid-cols-1">
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
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-line pt-3.5">
          <Button variant="overlayGhost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button disabled={!valid || saving} onClick={handleSave}>
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            {saving ? "Saving Changes…" : "Save Profile Changes"}
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
