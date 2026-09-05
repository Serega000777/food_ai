import type {
  AuthTokens,
  CreateGoalInput,
  DashboardResponse,
  Goal,
  MeResponse,
  UpdateProfileInput,
  User,
  UserProfile,
} from "@food-ai/contracts";

import { apiRequest, setTokens } from "./client";

export async function loginWithTelegram(initData: string): Promise<User> {
  const res = await apiRequest<{ user: User } & AuthTokens>(
    "/v1/auth/telegram",
    { method: "POST", body: JSON.stringify({ initData }) },
    false,
  );
  setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
  return res.user;
}

export function getMe(): Promise<MeResponse> {
  return apiRequest<MeResponse>("/v1/me");
}

export function updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
  return apiRequest<UserProfile>("/v1/me/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function createGoal(input: CreateGoalInput): Promise<Goal> {
  return apiRequest<Goal>("/v1/goals", { method: "POST", body: JSON.stringify(input) });
}

export function getDashboard(date?: string): Promise<DashboardResponse> {
  return apiRequest<DashboardResponse>(`/v1/dashboard${date ? `?date=${date}` : ""}`);
}
