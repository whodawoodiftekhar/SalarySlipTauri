import { apiClient } from "@/services/apiClient";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  initials: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  name: string;
  email: string;
}

export interface UpdateProfileResponse {
  ok: boolean;
  user: AuthUser;
  message: string;
}

export interface ChangePasswordPayload {
  currentPassword?: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordResponse {
  ok: boolean;
  message: string;
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    return apiClient.post<LoginResponse>("/auth/login", { email, password });
  },

  register: async (payload: RegisterPayload): Promise<LoginResponse> => {
    return apiClient.post<LoginResponse>("/auth/register", payload);
  },

  me: async (): Promise<{ user: AuthUser }> => {
    return apiClient.get<{ user: AuthUser }>("/auth/me");
  },

  updateProfile: async (payload: UpdateProfilePayload): Promise<UpdateProfileResponse> => {
    return apiClient.post<UpdateProfileResponse>("/auth/update-profile", payload);
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<ChangePasswordResponse> => {
    return apiClient.post<ChangePasswordResponse>("/auth/change-password", payload);
  },
};
