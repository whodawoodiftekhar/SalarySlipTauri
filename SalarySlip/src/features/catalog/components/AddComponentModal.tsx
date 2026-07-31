import { Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button, IconButton } from "@/shared/components/ui/Button";
import { Field, FIELD_INPUT } from "@/shared/components/ui/Field";
import { Overlay } from "@/shared/components/ui/Overlay";
import type { CatalogItem, ComponentGroup } from "@/shared/types";

export function AddComponentModal({
  saving,
  onCancel,
  onSave,
}: {
  saving: boolean;
  onCancel: () => void;
  onSave: (item: CatalogItem) => void;
}) {
  const [f, setF] = useState<CatalogItem>({
    code: "",
    name: "",
    group: "earning",
    calc: "Flat ₹",
    taxable: "Yes",
  });

  const set =
    (k: keyof CatalogItem) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setF({ ...f, [k]: e.target.value });

  const valid = Boolean(f.code.trim() && f.name.trim());

  const save = () => {
    onSave({
      code: f.code.trim().toUpperCase(),
      name: f.name.trim(),
      group: f.group as ComponentGroup,
      calc: f.calc,
      taxable: f.taxable,
    });
  };

  return (
    <Overlay onClose={onCancel}>
      <div
        className="w-full max-w-[460px] rounded-2xl bg-white p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <h3 className="m-0 text-[17px] font-bold text-ink">New Salary Component</h3>
          <IconButton onClick={onCancel} aria-label="Close">
            <X size={17} />
          </IconButton>
        </div>

        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Component Code *">
              <input
                className={FIELD_INPUT}
                value={f.code}
                onChange={set("code")}
                placeholder="e.g. BONUS"
              />
            </Field>

            <Field label="Component Name *">
              <input
                className={FIELD_INPUT}
                value={f.name}
                onChange={set("name")}
                placeholder="e.g. Performance Bonus"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Component Group">
              <select className={FIELD_INPUT} value={f.group} onChange={set("group")}>
                <option value="earning">Earning</option>
                <option value="deduction">Deduction</option>
              </select>
            </Field>

            <Field label="Calculation Method">
              <select className={FIELD_INPUT} value={f.calc} onChange={set("calc")}>
                <option value="Flat ₹">Flat ₹</option>
                <option value="% of Basic">% of Basic</option>
                <option value="% of Gross">% of Gross</option>
                <option value="PF (statutory)">PF (statutory)</option>
              </select>
            </Field>
          </div>

          <Field label="Taxable Status">
            <select className={FIELD_INPUT} value={f.taxable} onChange={set("taxable")}>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="Partly">Partly</option>
              <option value="—">— (Not applicable)</option>
            </select>
          </Field>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-line pt-4">
          <Button variant="overlayGhost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button disabled={!valid || saving} onClick={save}>
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Plus size={15} />
            )}
            {saving ? "Creating…" : "Add Component"}
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
