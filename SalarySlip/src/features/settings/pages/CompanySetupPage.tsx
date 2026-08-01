import { useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  FileText,
  ImageIcon,
  Loader2,
  MapPin,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { settingsService } from "@/features/settings/services/settingsService";
import { LOGO } from "@/shared/lib/branding";

/* ─── Reusable styled input field ───────────────────────────────────── */
function Field({
  label,
  hint,
  children,
  required = false,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center justify-between text-[12px] font-semibold text-slate-700">
        <span>
          {label} {required && <span className="text-rose-500 font-bold">*</span>}
        </span>
        {hint && <span className="text-[11px] font-normal text-slate-400">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-[13.5px] font-medium text-slate-900 shadow-xs transition-all duration-150 outline-none focus:border-blue-600 focus:bg-white focus:ring-3 focus:ring-blue-600/10 placeholder:text-slate-400 hover:border-slate-300";

/* ─── Main page ──────────────────────────────────────────────────────── */
export default function CompanySetupPage() {
  const { company, slipDefaults, refetchSettings } = useSettings();

  const [name, setName] = useState(company.name || "COMM-IT");
  const [legalName, setLegalName] = useState(
    company.legalName || "COMM-IT INDIA PVT. LTD."
  );
  const [city, setCity] = useState(
    company.city || (company.addressShort ? company.addressShort.replace(/\s*\d{5,6}$/, '') : "New Delhi")
  );
  const [pincode, setPincode] = useState(
    company.pincode || (company.addressShort ? (company.addressShort.match(/\d{5,6}$/)?.[0] || "") : "110025")
  );
  const [line1, setLine1] = useState(
    company.addressLines?.[0] ||
      "S-113, First Floor, Salcon Aurum, Jasola District Centre"
  );
  const [line2, setLine2] = useState(
    company.addressLines?.[1] || "Opposite Omax Square, New Delhi 110025"
  );
  const [logoUrl, setLogoUrl] = useState(company.logoUrl || "");
  const [watermarkText, setWatermarkText] = useState(
    company.watermarkText ?? ""
  );

  const computedAddressShort = [city, pincode].filter(Boolean).join(" ");

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("Logo image must be under 2 MB");
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
  };

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
          city,
          pincode,
          addressShort: computedAddressShort,
          addressLines: [line1, line2].filter(Boolean),
          logoUrl,
          watermarkText,
          isConfigured: true,
        },
        slipDefaults,
      });
      await refetchSettings();
      setSuccessMsg("Company configuration saved successfully");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setErrorMsg((err as Error)?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* ── Page Header / Hero ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-7 text-white shadow-lg">
        {/* Subtle background glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 right-48 h-48 w-48 rounded-full bg-indigo-600/15 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/15 px-2.5 py-1 text-[11px] font-semibold text-blue-400 border border-blue-500/20">
                <Building2 size={12} /> Organization Profile
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold border ${
                  company.isConfigured
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${company.isConfigured ? "bg-emerald-400" : "bg-amber-400"}`} />
                {company.isConfigured ? "Configured" : "Setup Required"}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Company Setup
            </h1>
            <p className="max-w-xl text-[13px] text-slate-300/90 leading-relaxed">
              Manage your brand logo, legal business details, address, and payslip watermark settings.
            </p>
          </div>

          {/* Live Card Badge Preview */}
          <div className="w-full sm:w-64 rounded-xl bg-slate-800/80 backdrop-blur-md border border-slate-700/80 p-3.5 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
              <Sparkles size={11} className="text-blue-400" /> Live Brand Card
            </div>
            <div className="flex items-center gap-3 bg-white/5 rounded-lg p-2.5 border border-white/5">
              <div className="flex h-10 w-12 items-center justify-center rounded bg-white p-1 shrink-0">
                <img
                  src={logoUrl || LOGO}
                  alt="logo preview"
                  className="max-h-8 max-w-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-white truncate">{name}</p>
                <p className="text-[10px] text-slate-400 truncate">{legalName}</p>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
              <MapPin size={10} className="shrink-0 text-slate-500" />
              <span className="truncate">{computedAddressShort || "Address Preview"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Status Alerts ────────────────────────────────────────── */}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-[13px] font-semibold text-emerald-800 shadow-xs">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-[13px] font-semibold text-rose-800 shadow-xs">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* ── Card 1: Branding & Visual Identity ───────────────────── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <ImageIcon size={16} />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-slate-900">
                  Branding &amp; Visual Identity
                </h2>
                <p className="text-[12px] text-slate-500">
                  Logo and watermark configurations applied across the app and generated PDF slips.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Logo Upload Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-slate-700">
                    Company Logo
                  </span>
                  <span className="text-[11px] font-normal text-slate-400">
                    PNG, JPG, SVG (Max 2 MB)
                  </span>
                </div>

                {logoUrl ? (
                  <div className="relative flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50/40 p-5 text-center">
                    <div className="flex h-20 w-full items-center justify-center rounded-lg bg-white p-3 border border-slate-100 shadow-xs">
                      <img
                        src={logoUrl}
                        alt="Company Logo"
                        className="max-h-16 max-w-full object-contain"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition">
                        <Upload size={13} /> Change Logo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setLogoUrl("")}
                        className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[12px] font-semibold text-rose-600 hover:bg-rose-100 transition"
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="group flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/40 p-6 text-center transition hover:border-blue-500 hover:bg-blue-50/20">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
                      <Upload size={18} />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-blue-600 group-hover:underline">
                        Click to upload logo
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Recommended height: 60px</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </label>
                )}
              </div>

              {/* Watermark Section */}
              <div className="space-y-2">
                <Field label="Payslip Watermark Text" hint="Max 30 characters">
                  <input
                    className={INPUT_CLASS}
                    value={watermarkText}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setWatermarkText(e.target.value)
                    }
                    placeholder="e.g. COMM-IT  ·  CONFIDENTIAL  ·  PAID"
                    maxLength={30}
                  />
                </Field>

                {/* Payslip Watermark Live Preview */}
                <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-inner">
                  <span
                    className="pointer-events-none select-none font-black uppercase tracking-[0.25em] text-slate-800 opacity-[0.07]"
                    style={{ fontSize: "clamp(20px, 4vw, 32px)", transform: "rotate(-20deg)" }}
                  >
                    {watermarkText || "PREVIEW WATERMARK"}
                  </span>
                  <div className="absolute top-2 left-2.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <FileText size={10} /> PDF Watermark Preview
                  </div>
                  <div
                    className="pointer-events-none absolute inset-0 opacity-15"
                    style={{
                      backgroundImage: "radial-gradient(circle, #64748b 1px, transparent 1px)",
                      backgroundSize: "14px 14px",
                    }}
                  />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── Card 2: Company Information ───────────────────────────── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Building2 size={16} />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-slate-900">
                  Company Details &amp; Address
                </h2>
                <p className="text-[12px] text-slate-500">
                  Legal entity name and address displayed on employee payslips.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Brand / Display Name" hint="App sidebar & header" required>
                <input
                  className={INPUT_CLASS}
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  placeholder="e.g. COMM-IT"
                  required
                />
              </Field>

              <Field label="Full Legal Entity Name" hint="Official registered name" required>
                <input
                  className={INPUT_CLASS}
                  value={legalName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLegalName(e.target.value)}
                  placeholder="e.g. COMM-IT INDIA PVT. LTD."
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="City" required>
                <input
                  className={INPUT_CLASS}
                  value={city}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCity(e.target.value)}
                  placeholder="e.g. New Delhi"
                  required
                />
              </Field>

              <Field label="PIN / Zip Code" required>
                <input
                  className={INPUT_CLASS}
                  value={pincode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPincode(e.target.value)}
                  placeholder="e.g. 110025"
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Address Line 1" required>
                <input
                  className={INPUT_CLASS}
                  value={line1}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLine1(e.target.value)}
                  placeholder="e.g. S-113, First Floor, Salcon Aurum"
                  required
                />
              </Field>

              <Field label="Address Line 2" hint="Optional Landmark / Suite">
                <input
                  className={INPUT_CLASS}
                  value={line2}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLine2(e.target.value)}
                  placeholder="e.g. Opposite Omax Square, New Delhi 110025"
                />
              </Field>
            </div>
          </div>
        </div>

        {/* ── Footer Action Bar ────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 sm:px-6">
          <div className="flex items-center gap-2 text-[12px] text-slate-500">
            <ShieldCheck size={16} className="text-blue-600 shrink-0" />
            <span>Changes persist to MongoDB settings</span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-[13.5px] font-bold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? "Saving Changes…" : "Save Company Setup"}
          </button>
        </div>
      </form>
    </div>
  );
}
