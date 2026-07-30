import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ComponentsPage from "@/features/catalog/ComponentsPage";
import DashboardPage from "@/features/dashboard/DashboardPage";
import EmployeesPage from "@/features/employees/EmployeesPage";
import { EmployeeProvider } from "@/features/employees/context/EmployeeProvider";
import PayrollPage from "@/features/payroll/PayrollPage";
import { SettingsProvider } from "@/features/settings/context/SettingsProvider";
import { AppLayout } from "@/layout/AppLayout";

export default function App() {
  return (
    <BrowserRouter>
      {/* settings load first — the shell needs the company name and period */}
      <SettingsProvider>
        <EmployeeProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="payroll/:employeeId" element={<PayrollPage />} />
              <Route
                path="payroll"
                element={<Navigate to="/employees" replace />}
              />
              <Route path="components" element={<ComponentsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </EmployeeProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}
