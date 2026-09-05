import { z } from "zod";

export const telegramAuthSchema = z.object({
  initData: z.string().min(1),
  // Detected client-side (Intl.DateTimeFormat().resolvedOptions().timeZone) and kept in
  // sync on every login — needed to assign a meal to the correct local diary day
  // (AT-009). Not user-editable UI yet; a manual override can be added to Profile later.
  timezone: z.string().min(1).optional(),
});
export type TelegramAuthInput = z.infer<typeof telegramAuthSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;
