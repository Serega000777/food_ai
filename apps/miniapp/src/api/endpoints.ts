import type {
  AuthTokens,
  CreateGoalInput,
  CreateMealInput,
  DashboardResponse,
  DiaryResponse,
  Food,
  Goal,
  MeResponse,
  MealEntryDto,
  UpdateMealInput,
  UpdateProfileInput,
  User,
  UserProfile,
} from "@food-ai/contracts";

import { apiRequest, setTokens } from "./client";

export async function loginWithTelegram(initData: string): Promise<User> {
  // AT-009 needs the user's real local day boundary server-side — detect it here
  // rather than asking onboarding for a manual timezone picker.
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const res = await apiRequest<{ user: User } & AuthTokens>(
    "/v1/auth/telegram",
    { method: "POST", body: JSON.stringify({ initData, timezone }) },
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

export function searchFoods(query: string): Promise<Food[]> {
  return apiRequest<Food[]>(`/v1/foods/search?q=${encodeURIComponent(query)}`);
}

export function createMeal(input: CreateMealInput): Promise<MealEntryDto> {
  // A fresh key per call — a network retry of the *same* underlying fetch reuses it
  // (and thus lands on the same meal, AT-015); a deliberate second "add meal" click is
  // a new call with its own key, which is what should happen.
  const idempotencyKey = crypto.randomUUID();
  return apiRequest<MealEntryDto>("/v1/meals", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(input),
  });
}

export function updateMeal(id: string, input: UpdateMealInput): Promise<MealEntryDto> {
  return apiRequest<MealEntryDto>(`/v1/meals/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteMeal(id: string): Promise<void> {
  return apiRequest<void>(`/v1/meals/${id}`, { method: "DELETE" });
}

export function getDiary(date?: string): Promise<DiaryResponse> {
  return apiRequest<DiaryResponse>(`/v1/diary${date ? `?date=${date}` : ""}`);
}
