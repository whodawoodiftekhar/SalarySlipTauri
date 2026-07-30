import { useContext } from "react";
import { EmployeeContext } from "../context/employeeContext";

export function useEmployees() {
  const ctx = useContext(EmployeeContext);
  if (!ctx)
    throw new Error("useEmployees must be used inside <EmployeeProvider>");
  return ctx;
}
