import { useState, useRef, useMemo, useEffect } from "react";
import {
  Database,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  XCircle,
  Users,
  Building2,
  TrendingUp,
  Wallet,
  Layers,
  Settings as SettingsIcon,
  CalendarDays,
  Mail,
  ShieldCheck,
  Archive,
  FileCode,
} from "lucide-react";
import { useEmployees } from "@/features/employees/hooks/useEmployees";
import { useCatalog } from "@/features/catalog/hooks/useCatalog";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { useDbStatus } from "@/shared/components/DbStatusBanner";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import { inr0 } from "@/shared/lib/format";
import {
  exportAllCollectionsToExcel,
  exportAllCollectionsToJson,
  parseMultiCollectionExcel,
  type ParsedMultiCollectionData,
} from "./excelHelpers";
import {
  databaseService,
  type ImportAllResponse,
} from "@/services/databaseService";

export default function DbConfigurePage() {
  const { roster, refetch: refetchEmployees } = useEmployees();
  const { company, refetchSettings } = useSettings();
  const { items: catalogItems, refetch: refetchCatalog } = useCatalog();
  const { dbConnected } = useDbStatus();

  const [activeTab, setActiveTab] = useState<"import" | "export">("export");

  // Live Database Collection Counts
  const [collectionCounts, setCollectionCounts] = useState<{
    employees: number;
    salaryComponents: number;
    salaryStructures: number;
    settings: boolean;
    payPeriodDays: number;
    payslips: number;
    mailAccount: boolean;
    users: number;
  }>({
    employees: 0,
    salaryComponents: 0,
    salaryStructures: 0,
    settings: false,
    payPeriodDays: 0,
    payslips: 0,
    mailAccount: false,
    users: 0,
  });

  // Fetch live counts for all collections from MongoDB
  const refreshCollectionCounts = async () => {
    try {
      const res = await databaseService.getAllCollections();
      if (res?.data) {
        setCollectionCounts({
          employees: res.data.employees?.length ?? 0,
          salaryComponents: res.data.salaryComponents?.length ?? 0,
          salaryStructures: res.data.salaryStructures?.length ?? 0,
          settings: Boolean(res.data.settings && (res.data.settings.company?.name || res.data.settings.payPeriod)),
          payPeriodDays: res.data.payPeriodDays?.length ?? 0,
          payslips: res.data.payslips?.length ?? 0,
          mailAccount: Boolean(res.data.mailAccount?.user),
          users: res.data.users?.length ?? 0,
        });
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    refreshCollectionCounts();
  }, [roster, catalogItems]);

  // Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedMultiCollectionData | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportAllResponse | null>(null);

  // Export State
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingJson, setIsExportingJson] = useState(false);

  // Set of existing employee IDs for quick matching
  const existingIdSet = useMemo(() => {
    return new Set(roster.map((e) => String(e.id).toLowerCase().trim()));
  }, [roster]);

  // Dynamically compute active departments from actual MongoDB roster
  const activeDepts = useMemo(() => {
    return Array.from(
      new Set(
        roster
          .map((e) => e.dept?.trim())
          .filter((d): d is string => Boolean(d))
      )
    ).sort();
  }, [roster]);

  // Dynamically compute totals from actual database records
  const totalMonthlyGross = useMemo(
    () => roster.reduce((sum, e) => sum + (e.gross || 0), 0),
    [roster]
  );
  const totalMonthlyNet = useMemo(
    () => roster.reduce((sum, e) => sum + (e.net || 0), 0),
    [roster]
  );

  // Employees parsed from Excel or JSON
  const parsedEmployees = useMemo(
    () => parsedData?.employees || [],
    [parsedData]
  );

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    setParseError(null);
    setImportResult(null);

    const result = await parseMultiCollectionExcel(file, existingIdSet);
    setIsParsing(false);

    if (result.error) {
      setParseError(result.error);
      setParsedData(null);
    } else {
      setParsedData(result.data);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setParsedData(null);
    setParseError(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Import all 8 collections into MongoDB
  const handleImportToDatabase = async () => {
    if (!parsedData) return;
    const validEmployees = parsedData.employees.filter((r) => r.isValid);

    setIsImporting(true);
    setImportResult(null);

    try {
      const res = await databaseService.importAllCollections({
        employees: validEmployees,
        salaryComponents: parsedData.salaryComponents,
        salaryStructures: parsedData.salaryStructures,
        settings: parsedData.settings,
        payPeriodDays: parsedData.payPeriodDays,
        payslips: parsedData.payslips,
        mailAccount: parsedData.mailAccount,
        users: parsedData.users,
      });

      setImportResult(res);
      await refetchEmployees();
      if (refetchSettings) await refetchSettings();
      if (refetchCatalog) await refetchCatalog();
      await refreshCollectionCounts();
    } catch (err: any) {
      setImportResult({
        success: false,
        summary: {
          employees: { created: 0, updated: 0, total: validEmployees.length },
          salaryComponents: { count: 0 },
          salaryStructures: { count: 0 },
          settings: false,
          payPeriodDays: { count: 0 },
          payslips: { count: 0 },
          mailAccount: false,
          users: { count: 0 },
          errors: [err.message || "Failed to import collections into database"],
        },
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Export all 8 database collections into multi-sheet Excel
  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const res = await databaseService.getAllCollections();
      if (res?.data) {
        await exportAllCollectionsToExcel(res.data, company.name);
      } else {
        await exportAllCollectionsToExcel(
          {
            employees: roster,
            salaryComponents: catalogItems,
            salaryStructures: [],
            settings: { company },
            payPeriodDays: [],
            payslips: [],
            mailAccount: {},
            users: [],
          },
          company.name
        );
      }
    } catch (err: any) {
      console.error("Database export failed, falling back to local state:", err);
      await exportAllCollectionsToExcel(
        {
          employees: roster,
          salaryComponents: catalogItems,
          salaryStructures: [],
          settings: { company },
          payPeriodDays: [],
          payslips: [],
          mailAccount: {},
          users: [],
        },
        company.name
      );
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Export 100% exact 1:1 replica of all 8 collections in pure JSON format
  const handleExportJson = async () => {
    setIsExportingJson(true);
    try {
      const res = await databaseService.getAllCollections();
      if (res?.data) {
        exportAllCollectionsToJson(res.data, company.name);
      }
    } catch (err: any) {
      console.error("JSON export failed:", err);
    } finally {
      setIsExportingJson(false);
    }
  };

  // Computed counters for employees
  const totalParsed = parsedEmployees.length;
  const newCount = parsedEmployees.filter((r) => r.status === "new").length;
  const updateCount = parsedEmployees.filter((r) => r.status === "update").length;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card>
        <CardHeader className="mb-0">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200">
              <Database size={22} />
            </span>
            <div>
              <CardTitle>Database Management Hub</CardTitle>
              <p className="mt-0.5 text-xs text-mist">
                Enterprise data management for complete database backup, restoration, and synchronization across all collections.
              </p>
            </div>
          </div>

          {/* Modern Action Switcher on Right Side */}
          <div className="flex items-center rounded-xl bg-slate-100/90 p-1 border border-slate-200/80 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab("import")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "import"
                  ? "bg-white text-cyan-800 shadow-sm ring-1 ring-slate-900/5"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Upload size={14} className={activeTab === "import" ? "text-cyan-600" : "text-slate-500"} />
              <span>Import Data</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("export")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "export"
                  ? "bg-white text-cyan-800 shadow-sm ring-1 ring-slate-900/5"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Download size={14} className={activeTab === "export" ? "text-cyan-600" : "text-slate-500"} />
              <span>Export Data</span>
            </button>
          </div>
        </CardHeader>
      </Card>

      {/* ──────────────── TAB 1: IMPORT FROM EXCEL / JSON ──────────────── */}
      {activeTab === "import" && (
        <div className="space-y-6">
          {/* Upload File Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`w-full rounded-2xl border-2 border-dashed p-8 transition flex flex-col items-center justify-center text-center ${
              selectedFile
                ? "border-cyan-400 bg-cyan-50/40"
                : "border-slate-300 bg-white hover:border-cyan-400 hover:bg-slate-50/60"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv, .json"
              onChange={handleFileChange}
              className="hidden"
              id="excel-file-upload"
            />

            {isParsing ? (
              <div className="flex flex-col items-center py-4">
                <RefreshCw className="h-8 w-8 animate-spin text-cyan-600 mb-2" />
                <p className="text-xs font-semibold text-slate-700">Validating and parsing file contents...</p>
              </div>
            ) : selectedFile ? (
              <div className="flex flex-col items-center gap-3 py-3 w-full">
                <div className="flex items-center justify-between w-full max-w-lg bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                      {selectedFile.name.endsWith(".json") ? (
                        <FileCode className="h-5 w-5 text-amber-600" />
                      ) : (
                        <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                      )}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {(selectedFile.size / 1024).toFixed(1)} KB · {totalParsed} records parsed
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="ml-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                    title="Remove file"
                  >
                    <XCircle size={18} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1 text-xs text-slate-500 font-semibold hover:text-cyan-700 transition cursor-pointer"
                >
                  Choose a different file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mb-2.5 grid h-12 w-12 place-items-center rounded-2xl bg-cyan-50 text-cyan-600 shadow-xs ring-1 ring-cyan-200/70 hover:bg-cyan-100 hover:scale-105 active:scale-95 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  title="Click to select database file"
                  aria-label="Upload database file"
                >
                  <Upload size={22} />
                </button>
                <p className="text-xs text-slate-600 font-medium">
                  Click upload icon or drag and drop your database file here
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Supports multi-sheet database workbooks (.xlsx, .xls) and complete JSON archives (.json)
                </p>
              </div>
            )}
          </div>

          {/* Error Banner */}
          {parseError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-bold">Error reading database file</p>
                <p className="mt-0.5 text-red-700">{parseError}</p>
              </div>
            </div>
          )}

          {/* Success / Result Banner */}
          {importResult && (
            <div
              className={`rounded-2xl border p-5 ${
                importResult.success
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <CheckCircle2
                  className={`h-6 w-6 shrink-0 ${
                    importResult.success ? "text-emerald-600" : "text-amber-600"
                  }`}
                />
                <div>
                  <h4 className="text-sm font-bold">
                    {importResult.success
                      ? "Database Synchronization Completed Successfully"
                      : "Import Completed with Operational Warnings"}
                  </h4>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span>
                      Employees:{" "}
                      <strong>{importResult.summary.employees.created} created</strong>,{" "}
                      <strong>{importResult.summary.employees.updated} updated</strong> (Total{" "}
                      {importResult.summary.employees.total})
                    </span>
                    {importResult.summary.salaryComponents.count > 0 && (
                      <span>
                        Catalog: <strong>{importResult.summary.salaryComponents.count} components</strong>
                      </span>
                    )}
                    {importResult.summary.salaryStructures.count > 0 && (
                      <span>
                        Structures: <strong>{importResult.summary.salaryStructures.count} profiles</strong>
                      </span>
                    )}
                    {importResult.summary.settings && (
                      <span>
                        Settings: <strong>Configured</strong>
                      </span>
                    )}
                    {importResult.summary.payPeriodDays.count > 0 && (
                      <span>
                        Attendance: <strong>{importResult.summary.payPeriodDays.count} records</strong>
                      </span>
                    )}
                    {importResult.summary.payslips?.count > 0 && (
                      <span>
                        Payslips: <strong>{importResult.summary.payslips.count} archives</strong>
                      </span>
                    )}
                    {importResult.summary.mailAccount && (
                      <span>
                        Mail Service: <strong>Configured</strong>
                      </span>
                    )}
                    {importResult.summary.users?.count > 0 && (
                      <span>
                        Accounts: <strong>{importResult.summary.users.count} users</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {importResult.summary.errors && importResult.summary.errors.length > 0 && (
                <div className="mt-3 rounded-xl bg-white/80 p-3 text-xs border border-amber-200">
                  <p className="font-semibold text-amber-800 mb-1">Warnings & Exceptions:</p>
                  <ul className="list-disc pl-5 space-y-0.5 text-amber-700">
                    {importResult.summary.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Submission Control Card (Directly Below File Dropzone) */}
          {parsedData && (
            <div className="relative overflow-hidden rounded-2xl border border-cyan-200/90 bg-gradient-to-r from-cyan-50/70 via-blue-50/40 to-white p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-600 text-white shadow-xs">
                    <Database size={16} />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Database Synchronization Ready
                  </h3>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Verified Package
                  </span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleClearFile}
                    disabled={isImporting}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 cursor-pointer transition disabled:opacity-50"
                  >
                    Discard File
                  </button>

                  <button
                    type="button"
                    onClick={handleImportToDatabase}
                    disabled={isImporting || dbConnected === false}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-cyan-600/20 hover:from-cyan-700 hover:to-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
                  >
                    {isImporting ? (
                      <RefreshCw size={15} className="animate-spin" />
                    ) : (
                      <Database size={15} />
                    )}
                    <span>
                      {isImporting
                        ? "Synchronizing Database..."
                        : "Synchronize Database"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Detected Collections Overview Cards (All 8 Collections - Destination Mapping) */}
          {parsedData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Employee Directory */}
              <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-2xs hover:border-slate-300 transition h-20 flex items-center justify-between">
                <div className="flex flex-col justify-between h-full min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <div className="grid h-5 w-5 place-items-center rounded bg-blue-50 text-blue-600 shrink-0">
                      <Users size={11} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 truncate">
                      Employee Directory
                    </span>
                  </div>
                  <span className="block text-[10px] text-slate-400 font-medium truncate leading-tight">
                    {newCount} new · {updateCount} existing
                  </span>
                  <div>
                    <span className="inline-flex items-center text-[9px] font-mono font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60 leading-none">
                      collection: employees
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right pl-2 flex flex-col items-end justify-center">
                  <b className="text-xl font-black text-slate-900 tracking-tight leading-none block">
                    {parsedEmployees.length}
                  </b>
                </div>
              </div>

              {/* Salary Catalog */}
              <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-2xs hover:border-slate-300 transition h-20 flex items-center justify-between">
                <div className="flex flex-col justify-between h-full min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <div className="grid h-5 w-5 place-items-center rounded bg-violet-50 text-violet-600 shrink-0">
                      <Layers size={11} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 truncate">
                      Salary Catalog
                    </span>
                  </div>
                  <span className="block text-[10px] text-slate-400 font-medium truncate leading-tight">
                    Master components
                  </span>
                  <div>
                    <span className="inline-flex items-center text-[9px] font-mono font-medium text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-200/60 leading-none">
                      collection: salarycomponents
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right pl-2 flex flex-col items-end justify-center">
                  <b className="text-xl font-black text-slate-900 tracking-tight leading-none block">
                    {parsedData.salaryComponents.length}
                  </b>
                </div>
              </div>

              {/* Salary Structures */}
              <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-2xs hover:border-slate-300 transition h-20 flex items-center justify-between">
                <div className="flex flex-col justify-between h-full min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <div className="grid h-5 w-5 place-items-center rounded bg-emerald-50 text-emerald-600 shrink-0">
                      <SettingsIcon size={11} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 truncate">
                      Salary Structures
                    </span>
                  </div>
                  <span className="block text-[10px] text-slate-400 font-medium truncate leading-tight">
                    Configured formulas
                  </span>
                  <div>
                    <span className="inline-flex items-center text-[9px] font-mono font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 leading-none">
                      collection: salarystructures
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right pl-2 flex flex-col items-end justify-center">
                  <b className="text-xl font-black text-slate-900 tracking-tight leading-none block">
                    {parsedData.salaryStructures.length}
                  </b>
                </div>
              </div>

              {/* Attendance Registry */}
              <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-2xs hover:border-slate-300 transition h-20 flex items-center justify-between">
                <div className="flex flex-col justify-between h-full min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <div className="grid h-5 w-5 place-items-center rounded bg-cyan-50 text-cyan-600 shrink-0">
                      <CalendarDays size={11} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 truncate">
                      Attendance Registry
                    </span>
                  </div>
                  <span className="block text-[10px] text-slate-400 font-medium truncate leading-tight">
                    Calendar & LOP records
                  </span>
                  <div>
                    <span className="inline-flex items-center text-[9px] font-mono font-medium text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200/60 leading-none">
                      collection: payperioddays
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right pl-2 flex flex-col items-end justify-center">
                  <b className="text-xl font-black text-slate-900 tracking-tight leading-none block">
                    {parsedData.payPeriodDays.length}
                  </b>
                </div>
              </div>

              {/* Payslip Archive */}
              <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-2xs hover:border-slate-300 transition h-20 flex items-center justify-between">
                <div className="flex flex-col justify-between h-full min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <div className="grid h-5 w-5 place-items-center rounded bg-indigo-50 text-indigo-600 shrink-0">
                      <Archive size={11} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 truncate">
                      Payslip Archive
                    </span>
                  </div>
                  <span className="block text-[10px] text-slate-400 font-medium truncate leading-tight">
                    Historical snapshots
                  </span>
                  <div>
                    <span className="inline-flex items-center text-[9px] font-mono font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/60 leading-none">
                      collection: payslips
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right pl-2 flex flex-col items-end justify-center">
                  <b className="text-xl font-black text-slate-900 tracking-tight leading-none block">
                    {parsedData.payslips.length}
                  </b>
                </div>
              </div>

              {/* Mail Service */}
              <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-2xs hover:border-slate-300 transition h-20 flex items-center justify-between">
                <div className="flex flex-col justify-between h-full min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <div className="grid h-5 w-5 place-items-center rounded bg-rose-50 text-rose-600 shrink-0">
                      <Mail size={11} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 truncate">
                      Mail Service
                    </span>
                  </div>
                  <span
                    className="block text-[10px] text-slate-400 font-medium truncate leading-tight"
                    title={parsedData.mailAccount?.user || "Not in file"}
                  >
                    {parsedData.mailAccount?.user || "Not in file"}
                  </span>
                  <div>
                    <span className="inline-flex items-center text-[9px] font-mono font-medium text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/60 leading-none">
                      collection: mailaccount
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right pl-2 flex flex-col items-end justify-center">
                  <b className="text-[13px] font-black text-slate-900 tracking-tight leading-none block">
                    {parsedData.mailAccount?.user ? "Configured" : "Unset"}
                  </b>
                </div>
              </div>

              {/* User Accounts */}
              <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-2xs hover:border-slate-300 transition h-20 flex items-center justify-between">
                <div className="flex flex-col justify-between h-full min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <div className="grid h-5 w-5 place-items-center rounded bg-amber-50 text-amber-600 shrink-0">
                      <ShieldCheck size={11} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 truncate">
                      User Accounts
                    </span>
                  </div>
                  <span className="block text-[10px] text-slate-400 font-medium truncate leading-tight">
                    Administrators
                  </span>
                  <div>
                    <span className="inline-flex items-center text-[9px] font-mono font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 leading-none">
                      collection: users
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right pl-2 flex flex-col items-end justify-center">
                  <b className="text-xl font-black text-slate-900 tracking-tight leading-none block">
                    {parsedData.users.length}
                  </b>
                </div>
              </div>

              {/* Company Profile */}
              <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-2xs hover:border-slate-300 transition h-20 flex items-center justify-between">
                <div className="flex flex-col justify-between h-full min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <div className="grid h-5 w-5 place-items-center rounded bg-slate-50 text-slate-600 shrink-0">
                      <Building2 size={11} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 truncate">
                      Company Profile
                    </span>
                  </div>
                  <span className="block text-[10px] text-slate-400 font-medium truncate leading-tight">
                    Setup parameters
                  </span>
                  <div>
                    <span className="inline-flex items-center text-[9px] font-mono font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 leading-none">
                      collection: companysetup
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right pl-2 flex flex-col items-end justify-center">
                  <b className="text-[13px] font-black text-slate-900 tracking-tight leading-none block">
                    {parsedData.settings && Object.keys(parsedData.settings).length > 0 ? "Present" : "Not in file"}
                  </b>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────── TAB 2: EXPORT DATA (EXCEL & JSON) ──────────────── */}
      {activeTab === "export" && (
        <div className="space-y-6">
          {/* Main Export Card */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                  <Download size={22} />
                </span>
                <div>
                  <CardTitle>Complete Database Export</CardTitle>
                  <p className="text-xs text-mist mt-0.5">
                    Generate an enterprise multi-sheet Excel spreadsheet or native JSON snapshot across all collections.
                  </p>
                </div>
              </div>

              {/* Export Buttons on Right Side */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleExportJson}
                  disabled={isExportingJson || roster.length === 0}
                  className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
                  title="Export native 1:1 MongoDB JSON archive"
                >
                  {isExportingJson ? (
                    <RefreshCw size={14} className="animate-spin text-amber-600" />
                  ) : (
                    <FileCode size={14} className="text-amber-600" />
                  )}
                  <span>Export JSON</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={isExportingExcel || roster.length === 0}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-600/20 hover:from-cyan-700 hover:to-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
                >
                  {isExportingExcel ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <Download size={15} />
                  )}
                  <span>{isExportingExcel ? "Generating Excel..." : "Export to Excel"}</span>
                </button>
              </div>
            </CardHeader>

            <div className="p-6 pt-2 space-y-6">
              {/* Executive Summary Cards: Height reduced by ~40% with modern icons & colors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Total Employees */}
                <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/40 via-white to-white px-3.5 py-2.5 shadow-xs transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                      TOTAL EMPLOYEES
                    </span>
                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                      <Users size={14} />
                    </div>
                  </div>
                  <div className="mt-1">
                    <b className="text-lg font-black text-slate-900 tracking-tight block leading-tight">
                      {roster.length}
                    </b>
                    <span className="mt-0.5 block text-[10.5px] font-medium text-slate-400 truncate">
                      Active payroll records
                    </span>
                  </div>
                </div>

                {/* Active Departments */}
                <div className="relative overflow-hidden rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/40 via-white to-white px-3.5 py-2.5 shadow-xs transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                      ACTIVE DEPARTMENTS
                    </span>
                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                      <Building2 size={14} />
                    </div>
                  </div>
                  <div className="mt-1">
                    <b className="text-lg font-black text-slate-900 tracking-tight block leading-tight">
                      {activeDepts.length}
                    </b>
                    <span className="mt-0.5 block text-[10.5px] font-medium text-slate-400 truncate">
                      Operational units
                    </span>
                  </div>
                </div>

                {/* Total Monthly Gross */}
                <div className="relative overflow-hidden rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/40 via-white to-white px-3.5 py-2.5 shadow-xs transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                      TOTAL MONTHLY GROSS
                    </span>
                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                      <TrendingUp size={14} />
                    </div>
                  </div>
                  <div className="mt-1">
                    <b className="text-lg font-black text-emerald-950 tracking-tight block leading-tight">
                      ₹{inr0(totalMonthlyGross)}
                    </b>
                    <span className="mt-0.5 block text-[10.5px] font-medium text-slate-400 truncate">
                      Pre-deduction payroll
                    </span>
                  </div>
                </div>

                {/* Total Monthly Net */}
                <div className="relative overflow-hidden rounded-xl border border-cyan-100 bg-gradient-to-br from-cyan-50/40 via-white to-white px-3.5 py-2.5 shadow-xs transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                      TOTAL MONTHLY NET
                    </span>
                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-cyan-50 text-cyan-600 ring-1 ring-cyan-100">
                      <Wallet size={14} />
                    </div>
                  </div>
                  <div className="mt-1">
                    <b className="text-lg font-black text-cyan-950 tracking-tight block leading-tight">
                      ₹{inr0(totalMonthlyNet)}
                    </b>
                    <span className="mt-0.5 block text-[10.5px] font-medium text-slate-400 truncate">
                      Net disbursement sum
                    </span>
                  </div>
                </div>
              </div>

              {/* Collections In This Export Grid (Clean Names, Dynamic Counts, No Numbers) */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Database Collections in Scope
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Employees */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex items-start gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
                      <Users size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">Employees</p>
                        <span className="text-[10.5px] font-bold text-blue-600">
                          {collectionCounts.employees} records
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Personnel master data, salary parameters, and banking credentials.
                      </p>
                    </div>
                  </div>

                  {/* Salary Catalog */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex items-start gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-violet-50 text-violet-600 shrink-0">
                      <Layers size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">Salary Catalog</p>
                        <span className="text-[10.5px] font-bold text-violet-600">
                          {collectionCounts.salaryComponents} components
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Earnings and deductions rules, formulas, and calculation parameters.
                      </p>
                    </div>
                  </div>

                  {/* Salary Structures */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex items-start gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                      <SettingsIcon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">Salary Structures</p>
                        <span className="text-[10.5px] font-bold text-emerald-600">
                          {collectionCounts.salaryStructures} profiles
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Configured component allocations, rate formulas, and prorate settings.
                      </p>
                    </div>
                  </div>

                  {/* Company Settings */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex items-start gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600 shrink-0">
                      <Building2 size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">Company Settings</p>
                        <span className="text-[10.5px] font-bold text-amber-600">
                          {collectionCounts.settings ? "Configured" : "Unset"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Organization details, address, active pay period, and slip defaults.
                      </p>
                    </div>
                  </div>

                  {/* Pay Period Days */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex items-start gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-50 text-cyan-600 shrink-0">
                      <CalendarDays size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">Pay Period Days</p>
                        <span className="text-[10.5px] font-bold text-cyan-600">
                          {collectionCounts.payPeriodDays} records
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Monthly calendar days, working days, and loss of pay (LOP) records.
                      </p>
                    </div>
                  </div>

                  {/* Payslips Archive */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex items-start gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                      <Archive size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">Payslip Archive</p>
                        <span className="text-[10.5px] font-bold text-indigo-600">
                          {collectionCounts.payslips} historical
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Finalized payslips, gross/net compensation, and dispatch status.
                      </p>
                    </div>
                  </div>

                  {/* Mail Account */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex items-start gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50 text-rose-600 shrink-0">
                      <Mail size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">Mail Account</p>
                        <span className="text-[10.5px] font-bold text-rose-600">
                          {collectionCounts.mailAccount ? "Connected" : "Unset"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Configured sender email address for automated payslip delivery.
                      </p>
                    </div>
                  </div>

                  {/* Users */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex items-start gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-teal-50 text-teal-600 shrink-0">
                      <ShieldCheck size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">User Accounts</p>
                        <span className="text-[10.5px] font-bold text-teal-600">
                          {collectionCounts.users} {collectionCounts.users === 1 ? "account" : "accounts"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Administrator credentials, system permissions, and security roles.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
