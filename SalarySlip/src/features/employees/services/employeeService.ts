import { apiClient } from "@/services";
import type { Employee } from "@/shared/types";
import type { NewEmployeeDto, UpdateEmployeeDto } from "../types";

export const employeeService = {
  async list(): Promise<Employee[]> {
    return apiClient.get<Employee[]>("/employees");
  },

  async getById(id: string): Promise<Employee> {
    return apiClient.get<Employee>(`/employees/${id}`);
  },

  async create(dto: NewEmployeeDto): Promise<Employee> {
    return apiClient.post<Employee>("/employees", dto);
  },

  async update(id: string, patch: UpdateEmployeeDto): Promise<Employee> {
    return apiClient.put<Employee>(`/employees/${id}`, patch);
  },

  /** Removes the employee along with their salary structure and payslips. */
  async remove(id: string): Promise<void> {
    await apiClient.delete<{ deleted: boolean }>(`/employees/${id}`);
  },

  /** Next free employee code, e.g. C11026. */
  async nextCode(): Promise<string> {
    const res = await apiClient.get<{ code: string }>("/employees/next-code");
    return res.code;
  },
};
