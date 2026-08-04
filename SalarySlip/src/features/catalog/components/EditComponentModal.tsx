import { AlertTriangle, Loader2, Save, X } from "lucide-react";
import { useState } from "react";
import { Button, IconButton } from "@/shared/components/ui/Button";
import { Field, FIELD_INPUT } from "@/shared/components/ui/Field";
import { Overlay } from "@/shared/components/ui/Overlay";
import { CALC_OPTIONS } from "@/shared/lib/calc";
import type { CatalogItem } from "@/shared/types";
import {
  componentCodeNote,
  isComponentCode,
  normalizeComponentCode,
} from "../lib/componentCode";

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
    code: item.code ?? "",
    name: item.name ?? "",
    group: item.group ?? ("earning" as CatalogItem["group"]),
    calc: item.calc ?? "Flat ₹",
    taxable: item.taxable ?? "Yes",
    order: item.order ? String(item.order) : "",
  });

  const set =
    (k: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setF({ ...f, [k]: e.target.value });

  const [codeNote, setCodeNote] = useState("");

  // the field holds the normalised code; the note reports what was corrected
  const setCode = (e: React.ChangeEvent<HTMLInputElement>) => {
    setF({ ...f, code: normalizeComponentCode(e.target.value) });
    setCodeNote(componentCodeNote(e.target.value));
  };

  const code = f.code.trim();
  const renaming = code !== item.code;
  const valid = isComponentCode(code) && Boolean(f.name.trim() && f.calc.trim());

  const handleSave = async () => {
    // the current code addresses the row; the new one travels in the patch
    await onSave(item.code, {
      code,
      name: f.name.trim(),
      group: f.group as CatalogItem["group"],
      calc: f.calc.trim(),
      taxable: f.taxable,
      ...(f.order.trim() ? { order: Number(f.order) } : {}),
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
          <Field label="Component Code *">
            <input
              className={FIELD_INPUT}
              value={f.code}
              onChange={setCode}
              placeholder="e.g. BONUS"
              autoCapitalize="characters"
              spellCheck={false}
            />
          </Field>
          {codeNote && (
            <p className="-mt-1.5 flex items-start gap-1.5 rounded-lg border border-warn-line bg-warn-bg px-2.5 py-2 text-[11.5px] leading-[1.45] text-warn-ink">
              <AlertTriangle size={13} className="mt-[1px] flex-none" />
              {codeNote}
            </p>
          )}
          {renaming && (
            <p className="-mt-1.5 text-[11.5px] leading-[1.45] text-warn-ink">
              Renaming {item.code} to {code || "—"} changes the field this component
              uses on the employee salary form, so amounts already saved under{" "}
              {item.code} stay where they are. Salary structures already assigned
              keep paying exactly as they do now.
            </p>
          )}

          <Field label="Component Name *">
            <input
              className={FIELD_INPUT}
              value={f.name}
              onChange={set("name")}
              placeholder="e.g. Special Bonus"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Group">
              <select
                className={FIELD_INPUT}
                value={f.group}
                onChange={set("group")}
              >
                <option value="earning">Earning</option>
                <option value="deduction">Deduction</option>
              </select>
            </Field>

            <Field label="Display order">
              <input
                className={FIELD_INPUT}
                type="number"
                min={1}
                value={f.order}
                onChange={set("order")}
                placeholder="e.g. 1"
              />
            </Field>
          </div>
          <p className="-mt-1.5 text-[11.5px] leading-[1.45] text-mist">
            Position on the employee salary form — 1 is the first field, 2 sits
            beside it, 3 starts the next row.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Calculation Method *">
              <select className={FIELD_INPUT} value={f.calc} onChange={set("calc")}>
                {/* a method typed in before this was a list stays selectable */}
                {!CALC_OPTIONS.includes(f.calc) && (
                  <option value={f.calc}>{f.calc}</option>
                )}
                {CALC_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Taxable">
              <select
                className={FIELD_INPUT}
                value={f.taxable}
                onChange={set("taxable")}
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Partly">Partly</option>
                <option value="—">— (Not applicable)</option>
              </select>
            </Field>
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
            {saving ? "Saving Changes…" : "Save Changes"}
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
