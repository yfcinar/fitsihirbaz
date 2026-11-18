import { z } from "zod";
import { optionalCoerced } from "./common";
import { SessionModeSchema } from "./package";

// Serbest listeler (hobi, spor, alerji...): boşluk kırpılır, en fazla 20 madde, her biri en fazla 60 karakter.
export const profileListSchema = z.array(z.string().trim().min(1).max(60)).max(20);

export const GenderSchema = z.enum(["MALE", "FEMALE", "OTHER"]);
export type Gender = z.infer<typeof GenderSchema>;

export const GoalSchema = z.enum(["WEIGHT_LOSS", "WEIGHT_GAIN", "MAINTENANCE", "MUSCLE_GAIN", "MEDICAL"]);
export type Goal = z.infer<typeof GoalSchema>;

export const ActivityLevelSchema = z.enum(["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"]);
export type ActivityLevel = z.infer<typeof ActivityLevelSchema>;

export const ClientProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  birthDate: z.string().nullable(),
  gender: GenderSchema.nullable(),
  heightCm: z.number().nullable(),
  goal: GoalSchema.nullable(),
  activityLevel: ActivityLevelSchema.nullable(),
  medicalNotes: z.string().nullable(),
  occupation: z.string().nullable(),
  hobbies: z.array(z.string()),
  sports: z.array(z.string()),
  dietaryPreferences: z.array(z.string()),
  allergies: z.array(z.string()),
  currentWeightKg: z.number().nullable(),
  targetWeightKg: z.number().nullable(),
  city: z.string().nullable(),
  preferredSessionMode: SessionModeSchema.nullable(),
  maxBudgetTry: z.number().int().nullable(),
});
export type ClientProfile = z.infer<typeof ClientProfileSchema>;

export const UpdateClientProfileInputSchema = z.object({
  birthDate: optionalCoerced(z.string().date("YYYY-MM-DD formatında olmalı")),
  gender: optionalCoerced(GenderSchema),
  heightCm: optionalCoerced(z.coerce.number().positive().max(300)),
  goal: optionalCoerced(GoalSchema),
  activityLevel: optionalCoerced(ActivityLevelSchema),
  medicalNotes: z.string().max(5000).optional(),
  occupation: optionalCoerced(z.string().trim().min(1).max(100)),
  hobbies: profileListSchema.optional(),
  sports: profileListSchema.optional(),
  dietaryPreferences: profileListSchema.optional(),
  allergies: profileListSchema.optional(),
  currentWeightKg: optionalCoerced(z.coerce.number().positive().max(500)),
  targetWeightKg: optionalCoerced(z.coerce.number().positive().max(500)),
  city: optionalCoerced(z.string().trim().min(1).max(80)),
  preferredSessionMode: optionalCoerced(SessionModeSchema),
  maxBudgetTry: optionalCoerced(z.coerce.number().int().positive().max(1_000_000)),
});
export type UpdateClientProfileInput = z.infer<typeof UpdateClientProfileInputSchema>;

export const ClientSummarySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  avatarUrl: z.string().nullable(),
  linkStatus: z.enum(["ACTIVE", "ENDED"]),
  linkSource: z.enum(["MARKETPLACE", "MANUAL_ADD"]),
  linkedAt: z.string(),
});
export type ClientSummary = z.infer<typeof ClientSummarySchema>;

// Diyetisyen tarafından, zaten kayıtlı bir danışanı e-posta ile kendine bağlarken kullanılır.
export const LinkToDietitianInputSchema = z.object({
  clientEmail: z.string().email("Geçerli bir e-posta girin"),
});
export type LinkToDietitianInput = z.infer<typeof LinkToDietitianInputSchema>;
