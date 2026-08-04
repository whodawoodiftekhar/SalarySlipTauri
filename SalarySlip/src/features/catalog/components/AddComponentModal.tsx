import { AlertTriangle, Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button, IconButton } from "@/shared/components/ui/Button";
import { Field, FIELD_INPUT } from "@/shared/components/ui/Field";
import { Overlay } from "@/shared/components/ui/Overlay";
import { CALC_OPTIONS } from "@/shared/lib/calc";
import type { CatalogItem, ComponentGroup } from "@/shared/types";
import {
  componentCodeNote,
  isComponentCode,
  normalizeComponentCode,
} from "../lib/componentCode";

export function AddComponentModal({
  saving,
  onCancel,
  onSave,
}: {
  saving: boolean;
  onCancel: () => void;
  onSave: (item: CatalogItem) => void;
}) {
  const [f, setF] = useState({
    code: "",
    name: "",
    group: "earning",
    calc: "Flat ₹",
    taxable: "Yes",
  });

  const [codeNote, setCodeNote] = useState("");

  const set =
    (k: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setF({ ...f, [k]: e.target.value });

  // the field holds the normalised code; the note reports what was corrected
  const setCode = (e: React.ChangeEvent<HTMLInputElement>) => {
    setF({ ...f, code: normalizeComponentCode(e.target.value) });
    setCodeNote(componentCodeNote(e.target.value));
  };

  const valid = isComponentCode(f.code) && Boolean(f.name.trim());

  // no display order here on purpose — the API numbers a new component last,
  // so adding one never reshuffles the salary form. Renumber it from Edit.
  const save = () => {
    onSave({
      code: f.code,
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
                onChange={setCode}
                placeholder="e.g. BONUS"
                autoCapitalize="characters"
                spellCheck={false}
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

          {codeNote && (
            <p className="-mt-1.5 flex items-start gap-1.5 rounded-lg border border-warn-line bg-warn-bg px-2.5 py-2 text-[11.5px] leading-[1.45] text-warn-ink">
              <AlertTriangle size={13} className="mt-[1px] flex-none" />
              {codeNote}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Component Group">
              <select className={FIELD_INPUT} value={f.group} onChange={set("group")}>
                <option value="earning">Earning</option>
                <option value="deduction">Deduction</option>
              </select>
            </Field>

            <Field label="Calculation Method">
              <select className={FIELD_INPUT} value={f.calc} onChange={set("calc")}>
                {CALC_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
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
          <p className="-mt-1.5 text-[11.5px] leading-[1.45] text-mist">
            It goes last on the employee salary form. Change its position from
            Edit once it exists.
          </p>
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
