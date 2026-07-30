import { Loader2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { payrollService } from "@/features/payroll/services/payrollService";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { Button, IconButton } from "@/shared/components/ui/Button";
import { Field, FIELD_INPUT, FormSection } from "@/shared/components/ui/Field";
import { Overlay } from "@/shared/components/ui/Overlay";
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
  const { departments } = useSettings();

  const [f, setF] = useState<EmployeeFormState>({
    name: "",
    id: "",
    dept: departments[0] ?? "",
    role: "",
    basic: "",
    special: "",
    onsite: "",
    tds: "",
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

  const valid = Boolean(f.name.trim() && f.role.trim() && num(f.basic) > 0);

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
      dept: f.dept,
      role: f.role.trim(),
      basic: num(f.basic),
      special: num(f.special),
      onsite: num(f.onsite),
      tds: num(f.tds),
    });

  return (
    <Overlay onClose={onCancel}>
      <div
        className="w-full max-w-[460px] rounded-2xl bg-white p-[22px] shadow-[0_24px_70px_rgba(0,0,0,0.4)] max-mob:max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="m-0 text-[17px] font-[650]">Add employee &amp; salary</h3>
          <IconButton onClick={onCancel} aria-label="Close">
            <X size={17} />
          </IconButton>
        </div>

        <div className="grid grid-cols-2 gap-3 max-xs:grid-cols-1">
          <Field label="Full name">
            <input
              className={FIELD_INPUT}
              value={f.name}
              onChange={set("name")}
              placeholder="e.g. Priya Sharma"
            />
          </Field>
          <Field label="Employee code">
            <input className={FIELD_INPUT} value={f.id} onChange={set("id")} />
          </Field>
          <Field label="Department">
            <select className={FIELD_INPUT} value={f.dept} onChange={set("dept")}>
              {departments.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Designation">
            <input
              className={FIELD_INPUT}
              value={f.role}
              onChange={set("role")}
              placeholder="e.g. Software Engineer"
            />
          </Field>

          <FormSection>Salary components — monthly ₹</FormSection>

          <Field label="Basic salary">
            <input
              className={FIELD_INPUT}
              type="number"
              value={f.basic}
              onChange={set("basic")}
              placeholder="0"
            />
          </Field>
          <Field label="Special allowance">
            <input
              className={FIELD_INPUT}
              type="number"
              value={f.special}
              onChange={set("special")}
              placeholder="0"
            />
          </Field>
          <Field label="Onsite incentive">
            <input
              className={FIELD_INPUT}
              type="number"
              value={f.onsite}
              onChange={set("onsite")}
              placeholder="0"
            />
          </Field>
          <Field label="TDS (monthly)">
            <input
              className={FIELD_INPUT}
              type="number"
              value={f.tds}
              onChange={set("tds")}
              placeholder="0"
            />
          </Field>
        </div>

        <div className="mt-[14px] rounded-[9px] bg-paper px-3 py-2.5 text-[11.5px] leading-[1.55] text-ash">
          HRA, Transport, Medical, PF and Professional Tax are attached
          automatically from the salary structure the server assigns. Fine-tune
          everything on the next screen.
        </div>

        {valid && preview?.key === seedKey && (
          <div className="mt-3 flex items-center justify-between rounded-[10px] border border-line px-[14px] py-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-ash">
              Estimated net / month
            </span>
            <b className="font-mono text-[18px] tabular-nums text-earn">
              ₹ {inr(preview.result.net)}
            </b>
          </div>
        )}

        <div className="mt-[18px] flex justify-end gap-2.5">
          <Button variant="overlayGhost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button disabled={!valid || saving} onClick={save}>
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Plus size={15} />
            )}
            {saving ? "Saving…" : "Add & open payroll"}
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
