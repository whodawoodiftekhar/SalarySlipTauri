import { useState } from "react";
import {
  Building2,
  Check,
  Image as ImageIcon,
  Save,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { settingsService } from "@/features/settings/services/settingsService";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { FIELD_INPUT } from "@/shared/components/ui/Field";

export default function CompanySetupPage() {
  const settings = useSettings();
  const { company, slipDefaults, refetchSettings } = settings;

  // Form State
  const [name, setName] = useState(company.name || "COMM-IT");
  const [legalName, setLegalName] = useState(
    company.legalName || "COMM-IT INDIA PVT. LTD."
  );
  const [addressShort, setAddressShort] = useState(
    company.addressShort || "New Delhi 110025"
  );
  const [line1, setLine1] = useState(
    company.addressLines?.[0] ||
      "S-113, First Floor, Salcon Aurum, Jasola District Centre"
  );
  const [line2, setLine2] = useState(
    company.addressLines?.[1] || "Opposite Omax Square, New Delhi 110025"
  );
  const [logoUrl, setLogoUrl] = useState(company.logoUrl || "");
  const [watermarkText, setWatermarkText] = useState(company.watermarkText || company.name || "");

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await settingsService.update({
        company: {
          name,
          legalName,
          addressShort,
          addressLines: [line1, line2].filter(Boolean),
          logoUrl,
          watermarkText,
          isConfigured: true,
        },
        slipDefaults: slipDefaults,
      });
      await refetchSettings();
      setSuccessMsg("Company setup saved successfully to MongoDB!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setErrorMsg(
        (err as Error)?.message || "Failed to save company setup"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-ink via-slate-900 to-indigo-950 p-6 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[12px] font-semibold tracking-wider text-white/70 uppercase">
              <Building2 size={14} className="text-amber-400" />
              Organization Settings
            </div>
            <h1 className="mt-1 text-[22px] font-extrabold tracking-tight text-white">
              Company Setup
            </h1>
            <p className="mt-1 text-[13px] text-white/80">
              Configure company name, logo, watermark, address and salary slip
              defaults — saved directly to MongoDB.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold backdrop-blur-sm">
            <Building2 size={16} className="text-amber-400" />
            {company.isConfigured ? "Setup Completed ✓" : "First-Time Setup"}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
          <Check size={16} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-xs font-semibold text-red-800">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* ── Logos & Branding ─────────────────────────────── */}
        <Card className="p-6 space-y-5">
          <h2 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-[15px] font-bold text-ink">
            <ImageIcon size={17} className="text-indigo-600" /> Logos &amp; Branding
          </h2>

          <div className="grid grid-cols-2 gap-6 max-mob:grid-cols-1">
            {/* Company Logo */}
            <div className="space-y-2">
              <p className="text-[13px] font-semibold text-ink">
                Company Header Logo
              </p>
              <p className="text-[12px] text-slate-500">
                Appears in the sidebar, slip header &amp; payslip top-left.
              </p>
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 text-center transition hover:border-indigo-400">
                {logoUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={logoUrl}
                      alt="Logo Preview"
                      className="max-h-20 max-w-full rounded-lg object-contain shadow-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 text-xs text-red-600 hover:bg-red-50"
                      onClick={() => setLogoUrl("")}
                    >
                      <Trash2 size={13} /> Remove
                    </Button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center gap-2 py-3">
                    <Upload size={24} className="text-indigo-500" />
                    <span className="text-[12px] font-medium text-indigo-600 hover:underline">
                      Click to upload logo image
                    </span>
                    <span className="text-[11px] text-slate-400">
                      PNG, JPG, SVG · max 2 MB
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          setErrorMsg("Logo image must be less than 2MB");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === "string") {
                            setLogoUrl(reader.result);
                            setErrorMsg(null);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Watermark Text */}
            <div className="space-y-2">
              <p className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                <Type size={14} className="text-indigo-500" />
                Payslip Watermark Text
              </p>
              <p className="text-[12px] text-slate-500">
                Faint diagonal text shown behind salary slip content when printed.
              </p>
              <div className="space-y-3">
                <input
                  className={FIELD_INPUT + " w-full"}
                  value={watermarkText}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setWatermarkText(e.target.value)
                  }
                  placeholder="e.g. COMM-IT, CONFIDENTIAL, PAID"
                  maxLength={30}
                />
                {/* Live preview */}
                <div className="relative flex h-24 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <span className="pointer-events-none rotate-[-25deg] select-none text-[28px] font-extrabold uppercase tracking-widest text-slate-800 opacity-10">
                    {watermarkText || "WATERMARK"}
                  </span>
                  <span className="absolute bottom-1.5 right-2.5 text-[10px] text-slate-400">Preview</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Company Information ───────────────────────────── */}
        <Card className="p-6 space-y-5">
          <h2 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-[15px] font-bold text-ink">
            <Building2 size={17} className="text-indigo-600" /> Company Information
          </h2>

          <div className="grid grid-cols-2 gap-4 max-mob:grid-cols-1">
            <div className="flex flex-col gap-1">
              <label className="text-[12.5px] font-semibold text-slate-700">
                Display Brand Name
              </label>
              <input
                className={FIELD_INPUT}
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setName(e.target.value)
                }
                placeholder="e.g. COMM-IT"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[12.5px] font-semibold text-slate-700">
                Full Legal Entity Name
              </label>
              <input
                className={FIELD_INPUT}
                value={legalName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setLegalName(e.target.value)
                }
                placeholder="e.g. COMM-IT INDIA PVT. LTD."
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[12.5px] font-semibold text-slate-700">
                City / Short Address
              </label>
              <input
                className={FIELD_INPUT}
                value={addressShort}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAddressShort(e.target.value)
                }
                placeholder="e.g. New Delhi 110025"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[12.5px] font-semibold text-slate-700">
                Address Line 1
              </label>
              <input
                className={FIELD_INPUT}
                value={line1}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setLine1(e.target.value)
                }
                placeholder="e.g. S-113, First Floor, Salcon Aurum"
                required
              />
            </div>

            <div className="col-span-2 flex flex-col gap-1 max-mob:col-span-1">
              <label className="text-[12.5px] font-semibold text-slate-700">
                Address Line 2
              </label>
              <input
                className={FIELD_INPUT}
                value={line2}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setLine2(e.target.value)
                }
                placeholder="e.g. Opposite Omax Square, New Delhi 110025"
              />
            </div>
          </div>
        </Card>


        {/* ── Save Button ───────────────────────────────────── */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            className="bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700"
            disabled={saving}
          >
            <Save size={15} />
            {saving ? "Saving to MongoDB..." : "Save Company Setup"}
          </Button>
        </div>
      </form>
    </div>
  );
}
