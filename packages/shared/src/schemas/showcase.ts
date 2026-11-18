import { z } from "zod";
import { GoalSchema } from "./client";

// Danışanın, değişimini (kilo geçmişi ve isteğe bağlı fotoğraf) bir diyetisyenin herkese açık
// vitrininde göstermesine verdiği açık ve geri alınabilir izin.

export const SetShowcaseConsentInputSchema = z.object({
  dietitianId: z.string().uuid(),
  active: z.boolean(),
  // Varsayılan en gizli ayarlar: anonim ve fotoğrafsız.
  anonymous: z.boolean().default(true),
  includePhotos: z.boolean().default(false),
});
export type SetShowcaseConsentInput = z.infer<typeof SetShowcaseConsentInputSchema>;

export const MyShowcaseConsentSchema = z.object({
  dietitianId: z.string().uuid(),
  dietitianName: z.string(),
  linkActive: z.boolean(),
  active: z.boolean(),
  anonymous: z.boolean(),
  includePhotos: z.boolean(),
  // En az iki kilo ölçümü olmadan "değişim" gösterilemez.
  eligible: z.boolean(),
  weightLogCount: z.number().int(),
});
export type MyShowcaseConsent = z.infer<typeof MyShowcaseConsentSchema>;

export const ListShowcaseInputSchema = z.object({
  dietitianId: z.string().uuid(),
});
export type ListShowcaseInput = z.infer<typeof ListShowcaseInputSchema>;

export const ShowcaseTransformationSchema = z.object({
  displayName: z.string(),
  goal: GoalSchema.nullable(),
  durationDays: z.number().int(),
  startWeightKg: z.number(),
  currentWeightKg: z.number(),
  changeKg: z.number(),
  changePercent: z.number(),
  beforePhotoUrl: z.string().nullable(),
  afterPhotoUrl: z.string().nullable(),
});
export type ShowcaseTransformation = z.infer<typeof ShowcaseTransformationSchema>;

export const RequestShowcaseConsentInputSchema = z.object({
  clientId: z.string().uuid(),
});
export type RequestShowcaseConsentInput = z.infer<typeof RequestShowcaseConsentInputSchema>;
