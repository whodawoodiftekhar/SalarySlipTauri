import { Loader2, Save, X } from "lucide-react";
import { useState } from "react";
import { Button, IconButton } from "@/shared/components/ui/Button";
import { Field, FIELD_INPUT } from "@/shared/components/ui/Field";
import { Overlay } from "@/shared/components/ui/Overlay";
import type { CatalogItem } from "@/shared/types";

export function EditComponentModal({
  item,
  saving,
  onCancel,
  onSave,
}: {
  item: CatalogItem;
  saving: boolean;
  onCancel: () => void;
  onSave: (code: string, patch: Partial<CatalogItem>) => Promise<void>;
}) {
  const [f, setF] = useState({
    name: item.name ?? "",
    group: item.group ?? ("Earnings" as CatalogItem["group"]),
    calc: item.calc ?? "Flat",
    taxable: item.taxable ?? "Yes",
  });

  const set =
    (k: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setF({ ...f, [k]: e.target.value });

  const valid = Boolean(f.name.trim() && f.calc.trim());

  const handleSave = async () => {
    await onSave(item.code, {
      name: f.name.trim(),
      group: f.group as CatalogItem["group"],
      calc: f.calc.trim(),
      taxable: f.taxable,
    });
  };

  return (
    <Overlay onClose={onCancel}>
      <div
        className="w-full max-w-[500px] rounded-2xl bg-white p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)] space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="m-0 text-[18px] font-bold text-ink">Edit Salary Component</h3>
            <p className="mt-0.5 text-[12px] text-mist">
              Modify details for {item.name} ({item.code}).
            </p>
          </div>
          <IconButton onClick={onCancel} aria-label="Close">
            <X size={18} />
          </IconButton>
        </div>

        <div className="space-y-3">
          <Field label="Component Code">
            <input
              className={`${FIELD_INPUT} bg-paper text-ash cursor-not-allowed`}
              value={item.code}
              disabled
            />
          </Field>
          <Field label="Component Name *">
            <input
              className={FIELD_INPUT}
              value={f.name}
              onChange={set("name")}
              placeholder="e.g. Special Bonus"
            />
          </Field>
          <Field label="Group">
            <select
              className={FIELD_INPUT}
              value={f.group}
              onChange={set("group")}
            >
              <option value="Earnings">Earnings</option>
              <option value="Deductions">Deductions</option>
            </select>
          </Field>
          <Field label="Calculation Method *">
            <input
              className={FIELD_INPUT}
              value={f.calc}
              onChange={set("calc")}
              placeholder="e.g. Flat, 50% Basic, 12% Basic"
            />
          </Field>
          <Field label="Taxable">
            <select
              className={FIELD_INPUT}
              value={f.taxable}
              onChange={set("taxable")}
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="Partial">Partial</option>
            </select>
          </Field>
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
            {saving ? "Saving Changes…" : "Save Changes"}
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
