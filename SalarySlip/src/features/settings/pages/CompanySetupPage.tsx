import { useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ImageIcon,
  Loader2,
  MapPin,
  Save,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { settingsService } from "@/features/settings/services/settingsService";
import { LOGO } from "@/shared/lib/branding";

/* ─── Reusable styled field ─────────────────────────────────────────── */
function Field({
  label,
  hint,
  children,
  span2 = false,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  span2?: boolean;
}) {
  return (
    <label
      className={`flex flex-col gap-1.5 ${span2 ? "col-span-2 max-[640px]:col-span-1" : ""}`}
    >
      <span className="text-[11.5px] font-bold uppercase tracking-[0.07em] text-slate-500">
        {label}
      </span>
      {children}
      {hint && (
        <span className="text-[11px] text-slate-400 leading-tight">{hint}</span>
      )}
    </label>
  );
}

const INPUT =
  "w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-[13.5px] font-medium text-slate-800 shadow-sm transition-all duration-150 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-300 hover:border-slate-300";

/* ─── Section card wrapper ───────────────────────────────────────────── */
function Section({
  icon,
  title,
  accent = "indigo",
  children,
}: {
  icon: React.ReactNode;
  title: string;
  accent?: string;
  children: React.ReactNode;
}) {
  const accentMap: Record<string, string> = {
    indigo: "from-indigo-500 to-violet-500",
    emerald: "from-emerald-500 to-teal-500",
    amber: "from-amber-500 to-orange-500",
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      {/* Section header stripe */}
      <div
        className={`flex items-center gap-3 bg-gradient-to-r ${accentMap[accent] ?? accentMap.indigo} px-5 py-3.5`}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white">
          {icon}
        </div>
        <h2 className="text-[13px] font-bold tracking-wide text-white uppercase">
          {title}
        </h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

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
      setErrorMsg("Logo must be under 2 MB");
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
      setSuccessMsg("Company profile saved to MongoDB!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setErrorMsg((err as Error)?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">

      {/* ── Hero Banner ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4f46e5] p-7 text-white shadow-xl">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/5 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 right-32 h-40 w-40 rounded-full bg-indigo-400/10 blur-2xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-indigo-300">
              <Building2 size={12} /> Organization Settings
            </p>
            <h1 className="text-[26px] font-extrabold tracking-tight leading-tight">
              Company Setup
            </h1>
            <p className="mt-1.5 max-w-sm text-[13px] text-indigo-200/80 leading-relaxed">
              Configure your brand logo, watermark, company name &amp; address.
              Everything is saved to <span className="font-semibold text-white">MongoDB</span>.
            </p>
          </div>

          {/* Live mini-card preview */}
          <div className="flex-none w-56 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 p-3.5 shadow-inner">
            <div className="flex items-center gap-2.5 border-b border-white/10 pb-2.5 mb-2.5">
              <img
                src={logoUrl || LOGO}
                alt="logo"
                className="h-7 w-auto max-w-[56px] rounded object-contain bg-white/10 p-0.5"
              />
              <div>
                <p className="text-[11px] font-extrabold leading-none text-white">{name}</p>
                <p className="text-[9.5px] text-indigo-300 mt-0.5 leading-tight truncate max-w-[110px]">{legalName}</p>
              </div>
            </div>
            <p className="text-[9.5px] text-indigo-300 flex items-start gap-1 leading-tight">
              <MapPin size={9} className="mt-0.5 shrink-0" />
              <span className="line-clamp-2">{computedAddressShort}</span>
            </p>
            <div className="mt-2 rounded-md bg-white/10 px-2 py-1 text-center text-[8.5px] font-bold uppercase tracking-widest text-white/50">
              {watermarkText || "WATERMARK PREVIEW"}
            </div>
          </div>
        </div>

        {/* Status pill */}
        <div className="absolute right-5 top-5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${
              company.isConfigured
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-amber-500/20 text-amber-300"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${company.isConfigured ? "bg-emerald-400" : "bg-amber-400"}`} />
            {company.isConfigured ? "Configured" : "First-time Setup"}
          </span>
        </div>
      </div>

      {/* ── Toast messages ──────────────────────────────────────── */}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-medium text-emerald-800 shadow-sm animate-[fadeIn_0.2s_ease]">
          <CheckCircle2 size={17} className="shrink-0 text-emerald-500" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-800 shadow-sm">
          <AlertCircle size={17} className="shrink-0 text-red-500" />
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">

        {/* ── Branding ────────────────────────────────────────────── */}
        <Section icon={<ImageIcon size={15} />} title="Branding &amp; Visual Identity" accent="indigo">
          <div className="grid grid-cols-2 gap-5 max-[640px]:grid-cols-1">

            {/* Logo upload */}
            <div className="space-y-2">
              <p className="text-[11.5px] font-bold uppercase tracking-[0.07em] text-slate-500">
                Company Logo
              </p>
              <p className="text-[12px] text-slate-400">
                Shown in sidebar, payslip header &amp; printed slip. PNG / SVG / JPG, max 2 MB.
              </p>

              {logoUrl ? (
                <div className="group relative flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-5">
                  <img
                    src={logoUrl}
                    alt="Company Logo"
                    className="max-h-24 max-w-full rounded-lg object-contain shadow-sm drop-shadow"
                  />
                  <button
                    type="button"
                    onClick={() => setLogoUrl("")}
                    className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11.5px] font-semibold text-red-600 transition hover:bg-red-100"
                  >
                    <Trash2 size={12} /> Remove Logo
                  </button>
                  <span className="absolute top-2 right-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-600">
                    ✓ Uploaded
                  </span>
                </div>
              ) : (
                <label className="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-7 text-center transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-50/30">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 transition group-hover:bg-indigo-200">
                    <Upload size={20} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-indigo-600 group-hover:underline">
                      Click to upload logo
                    </p>
                    <p className="text-[11px] text-slate-400">PNG, SVG, JPG · max 2 MB</p>
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

            {/* Watermark text */}
            <div className="space-y-2">
              <p className="text-[11.5px] font-bold uppercase tracking-[0.07em] text-slate-500 flex items-center gap-1.5">
                <Type size={12} /> Payslip Watermark Text
              </p>
              <p className="text-[12px] text-slate-400">
                Faint diagonal text printed behind payslip content. Max 30 characters.
              </p>
              <input
                className={INPUT}
                value={watermarkText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setWatermarkText(e.target.value)
                }
                placeholder="e.g. COMM-IT  ·  CONFIDENTIAL  ·  PAID"
                maxLength={30}
              />
              {/* Live preview box */}
              <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-inner">
                <span
                  className="pointer-events-none select-none font-extrabold uppercase tracking-[0.2em] text-slate-700 opacity-[0.08]"
                  style={{ fontSize: "clamp(22px, 5vw, 38px)", transform: "rotate(-25deg)" }}
                >
                  {watermarkText || "PREVIEW"}
                </span>
                <div className="absolute inset-0 flex flex-col items-end justify-end p-2">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                    Live Preview
                  </span>
                </div>
                {/* Grid dots overlay */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
                    backgroundSize: "16px 16px",
                  }}
                />
              </div>
            </div>
          </div>
        </Section>

        {/* ── Company Information ──────────────────────────────────── */}
        <Section icon={<Building2 size={15} />} title="Company Information" accent="emerald">
          <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">

            <Field label="Brand / Display Name" hint="Short name shown on UI">
              <input
                className={INPUT}
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                placeholder="e.g. COMM-IT"
                required
              />
            </Field>

            <Field label="Full Legal Entity Name" hint="Used on formal documents">
              <input
                className={INPUT}
                value={legalName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLegalName(e.target.value)}
                placeholder="e.g. COMM-IT INDIA PVT. LTD."
                required
              />
            </Field>

            <Field label="City" hint="City name for payslip header">
              <input
                className={INPUT}
                value={city}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCity(e.target.value)}
                placeholder="e.g. New Delhi"
                required
              />
            </Field>

            <Field label="PIN Code" hint="Postal PIN code">
              <input
                className={INPUT}
                value={pincode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPincode(e.target.value)}
                placeholder="e.g. 110025"
                required
              />
            </Field>

            <Field label="Address Line 1">
              <input
                className={INPUT}
                value={line1}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLine1(e.target.value)}
                placeholder="e.g. S-113, First Floor, Salcon Aurum"
                required
              />
            </Field>

            <Field label="Address Line 2">
              <input
                className={INPUT}
                value={line2}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLine2(e.target.value)}
                placeholder="e.g. Opposite Omax Square, New Delhi 110025"
              />
            </Field>
          </div>
        </Section>

        {/* ── Save bar ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-[12.5px] text-slate-500">
            All changes are saved to the <span className="font-semibold text-slate-700">companysetup</span> collection in MongoDB.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-[13.5px] font-bold text-white shadow-md shadow-indigo-200 transition-all duration-150 hover:from-indigo-700 hover:to-violet-700 hover:shadow-indigo-300 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            {saving ? "Saving…" : "Save Company Setup"}
          </button>
        </div>

      </form>
    </div>
  );
}
