import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ComponentsPage from "@/features/catalog/ComponentsPage";
import DashboardPage from "@/features/dashboard/DashboardPage";
import EmployeesPage from "@/features/employees/EmployeesPage";
import AddEmployeePage from "@/features/employees/AddEmployeePage";
import { EmployeeProvider } from "@/features/employees/context/EmployeeProvider";
import PayrollPage from "@/features/payroll/PayrollPage";
import PayRunPage from "@/features/payrun/PayRunPage";
import PayslipsPage from "@/features/payslips/PayslipsPage";
import { SettingsProvider } from "@/features/settings/context/SettingsProvider";
import CompanySetupPage from "@/features/settings/pages/CompanySetupPage";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { AppLayout } from "@/layout/AppLayout";
import { AuthProvider } from "@/features/auth/AuthContext";
import { LoginPage } from "@/features/auth/LoginPage";
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <EmployeeProvider>
            <Routes>
              {/* Unprotected Public Auth Route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected App Routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="employees" element={<EmployeesPage />} />
                  <Route path="employees/new" element={<AddEmployeePage />} />
                  <Route path="payroll/:employeeId" element={<PayrollPage />} />
                  <Route
                    path="payroll"
                    element={<Navigate to="/employees" replace />}
                  />
                  <Route path="pay-run" element={<PayRunPage />} />
                  <Route path="payslips" element={<PayslipsPage />} />
                  <Route path="components" element={<ComponentsPage />} />
                  <Route path="settings" element={<CompanySetupPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Route>
            </Routes>
          </EmployeeProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
