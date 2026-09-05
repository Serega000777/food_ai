import { z } from "zod";

export const unitSystemSchema = z.enum(["metric", "imperial"]);
export type UnitSystem = z.infer<typeof unitSystemSchema>;

export const sexSchema = z.enum(["male", "female"]);
export type Sex = z.infer<typeof sexSchema>;

export const userStatusSchema = z.enum(["active", "suspended", "deleted"]);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const userSchema = z.object({
  id: z.string().uuid(),
  locale: z.string(),
  timezone: z.string(),
  status: userStatusSchema,
});
export type User = z.infer<typeof userSchema>;

/** birthDate is nullable until onboarding (Phase 2) fills it in. */
export const userProfileSchema = z.object({
  birthDate: z.string().nullable(),
  sex: sexSchema.nullable(),
  heightCm: z.number().int().positive().nullable(),
  unitSystem: unitSystemSchema,
});
export type UserProfile = z.infer<typeof userProfileSchema>;

export const meResponseSchema = z.object({
  user: userSchema,
  profile: userProfileSchema,
});
export type MeResponse = z.infer<typeof meResponseSchema>;

/** All fields optional: onboarding may send them one screen at a time (product
 * blueprint §5.3–§5.5: "autosave onboarding draft"). */
export const updateProfileSchema = z.object({
  birthDate: z.string().date().optional(),
  sex: sexSchema.optional(),
  heightCm: z.number().int().positive().max(300).optional(),
  unitSystem: unitSystemSchema.optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
