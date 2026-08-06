import React, { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { authService } from "@/features/auth/services/authService";
import { useForm } from "@/shared/hooks/useForm";
import {
  User as UserIcon,
  Mail,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Save,
} from "lucide-react";

export const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();

  // Unified Form Hook for Profile and Password data
  const { values, handleChange, resetForm } = useForm({
    name: user?.name || "",
    email: user?.email || "",
    newPassword: "",
    confirmPassword: "",
  });

  // Sync form values when authenticated user context updates
  useEffect(() => {
    if (user) {
      resetForm({
        name: user.name || "",
        email: user.email || "",
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
    }
  }, [user]);

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Status states for Card 1 (Profile)
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Status states for Card 2 (Password)
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!values.name.trim() || !values.email.trim()) {
      setProfileError("Full Name and Email / Username are required.");
      return;
    }

    setProfileLoading(true);

    try {
      await updateProfile(values.name.trim(), values.email.trim());
      setProfileSuccess("Profile details updated successfully!");
    } catch (err: any) {
      console.error("Update profile error:", err);
      let msg = "Failed to update profile details. Please try again.";
      if (err?.message) {
        try {
          const parsed = JSON.parse(err.message.split(" — ")[1] || "{}");
          if (parsed.message) msg = parsed.message;
        } catch {
          msg = err.message;
        }
      }
      setProfileError(msg);
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (!values.newPassword || !values.confirmPassword) {
      setPassError("Please fill in both New Password and Confirm Password fields.");
      return;
    }

    if (values.newPassword !== values.confirmPassword) {
      setPassError("New password and confirm password do not match.");
      return;
    }

    if (values.newPassword.length < 6) {
      setPassError("New password must be at least 6 characters long.");
      return;
    }

    setPassLoading(true);

    try {
      const res = await authService.changePassword({
        currentPassword: "",
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });

      setPassSuccess(res.message || "Password updated successfully!");
      resetForm({
        ...values,
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: any) {
      console.error("Change password error:", err);
      let msg = "Failed to update password. Please try again.";
      if (err?.body) {
        try {
          const parsed = JSON.parse(err.body);
          if (parsed.message) msg = parsed.message;
        } catch {
          /* fallback */
        }
      }
      setPassError(msg);
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200">
            <UserIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              HR Admin Profile & Security
            </h1>
            <p className="text-sm text-slate-500">
              Manage your administrator account details and login password
            </p>
          </div>
        </div>
      </div>

      {/* Two Cards Layout */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        
        {/* CARD 1: Profile Details Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="space-y-6">
            
            {/* Card Header & Avatar Badge */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-accent font-bold text-sm">
                  {user?.initials || "HR"}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Account Information</h2>
                  <p className="text-xs text-slate-500">{user?.role || "HR Administrator"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-emerald-700 font-medium bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Active Account</span>
              </div>
            </div>

            {profileError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 flex-none text-rose-500 mt-0.5" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
                <CheckCircle2 className="h-4 w-4 flex-none text-emerald-600 mt-0.5" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {/* Profile Form */}
            <form id="profile-details-form" onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
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
                    value={values.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
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
                    value={values.email}
                    onChange={handleChange}
                    placeholder="Enter your email or username"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
                  />
                </div>
              </div>
            </form>
          </div>

          <div className="pt-6 border-t border-slate-100 mt-6 flex justify-end">
            <button
              type="submit"
              form="profile-details-form"
              disabled={profileLoading}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 transition"
            >
              {profileLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Profile Details</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* CARD 2: Security & Password Update Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="space-y-6">
            
            {/* Card Header */}
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Security & Password</h2>
                <p className="text-xs text-slate-500">Update your account login password</p>
              </div>
            </div>

            {passError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 flex-none text-rose-500 mt-0.5" />
                <span>{passError}</span>
              </div>
            )}

            {passSuccess && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
                <CheckCircle2 className="h-4 w-4 flex-none text-emerald-600 mt-0.5" />
                <span>{passSuccess}</span>
              </div>
            )}

            {/* Password Form */}
            <form id="password-update-form" onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showNew ? "text" : "password"}
                    name="newPassword"
                    required
                    value={values.newPassword}
                    onChange={handleChange}
                    placeholder="Enter new password (min 6 chars)"
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showConfirm ? "text" : "password"}
                    name="confirmPassword"
                    required
                    value={values.confirmPassword}
                    onChange={handleChange}
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
            </form>
          </div>

          <div className="pt-6 border-t border-slate-100 mt-6 flex justify-end">
            <button
              type="submit"
              form="password-update-form"
              disabled={passLoading}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {passLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
