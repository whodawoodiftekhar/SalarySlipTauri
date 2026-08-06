import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { authService } from "./services/authService";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { LOGO } from "@/shared/lib/branding";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

export const ResetPasswordPage: React.FC = () => {
  const { company } = useSettings();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("Invalid reset link. Token parameter is missing.");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError("Please fill in both New Password and Confirm Password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const res = await authService.resetPassword({
        token,
        newPassword,
        confirmPassword,
      });

      setSuccess(res.message || "Password updated successfully!");
    } catch (err: any) {
      console.error("Reset password error:", err);
      let msg = "Failed to reset password. The link may have expired.";
      if (err?.message) {
        try {
          const parsed = JSON.parse(err.message.split(" — ")[1] || "{}");
          if (parsed.message) msg = parsed.message;
        } catch {
          msg = err.message;
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-slate-50 px-4 py-12 overflow-y-auto">
      {/* Subtle Light Decor Elements */}
      <div className="absolute top-10 left-10 h-72 w-72 rounded-full bg-blue-100/60 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 h-72 w-72 rounded-full bg-indigo-100/60 blur-[100px] pointer-events-none" />

      {/* Main White Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl transition-all duration-300">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-auto items-center justify-center rounded-2xl bg-indigo-50/80 px-6 py-3 ring-1 ring-indigo-200">
            <img src={company?.logoUrl || LOGO} alt="Company Logo" className="h-12 max-h-12 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Set New Password
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Create a new password for your HR Administrator account
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none text-rose-500" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Success Banner */}
        {success ? (
          <div className="mt-6 text-center space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 text-left">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-600" />
              <span className="leading-relaxed">{success}</span>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 h-11 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
            >
              <span>Go to Sign In</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showNew ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 chars)"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 transition focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 transition focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 h-11 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 hover:shadow-md active:scale-[0.99] disabled:opacity-60 transition-all duration-200 mt-2"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>Update Password</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
