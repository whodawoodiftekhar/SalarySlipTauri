import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { LOGO } from "@/shared/lib/branding";
import { Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, User as UserIcon } from "lucide-react";

export const LoginPage: React.FC = () => {
  const { company } = useSettings();
  const [mode, setMode] = useState<"login" | "signup">("login");

  // Single common useState object for form submission data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        await login(formData.email, formData.password);
      } else {
        if (!formData.name.trim()) {
          setError("Full Name is required for registration.");
          setLoading(false);
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          setError("Password and Confirm Password do not match.");
          setLoading(false);
          return;
        }
        await register(formData.name, formData.email, formData.password);
      }
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Auth failed:", err);
      let msg = mode === "login"
        ? "Invalid email or password. Please try again."
        : "Failed to create account. Please check your details.";
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
            {mode === "login" ? "HR Portal Login" : "Create HR Account"}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {mode === "login"
              ? "Sign in to access Payroll Management & Employee Details"
              : "Enter your HR details to register a new admin account"}
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none text-rose-500" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Form with readOnly protection & dummy inputs to prevent browser autofill */}
        <form onSubmit={handleSubmit} autoComplete="off" className="mt-6 space-y-3.5">
          
          {/* Dummy hidden inputs to absorb browser autofill */}
          <input type="text" name="prevent_autofill_email" className="hidden" tabIndex={-1} aria-hidden />
          <input type="password" name="prevent_autofill_pass" className="hidden" tabIndex={-1} aria-hidden />

          {/* Registration Extra Fields */}
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Email / Username <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="text"
                name="email"
                required
                readOnly={isReadOnly}
                onFocus={() => setIsReadOnly(false)}
                onClick={() => setIsReadOnly(false)}
                autoComplete="off"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email or username"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                readOnly={isReadOnly}
                onFocus={() => setIsReadOnly(false)}
                onClick={() => setIsReadOnly(false)}
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                placeholder={mode === "login" ? "Enter your password" : "Create password (min. 6 chars)"}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 transition focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Field for Sign Up */}
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  required
                  readOnly={isReadOnly}
                  onFocus={() => setIsReadOnly(false)}
                  onClick={() => setIsReadOnly(false)}
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 transition focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 h-11 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-900/20 active:scale-[0.99] disabled:opacity-60 transition-all duration-200 mt-2"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        {/* Bottom Switch Link */}
        <div className="mt-5 text-center text-xs text-slate-500">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline transition ml-1"
              >
                Create Account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline transition ml-1"
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
