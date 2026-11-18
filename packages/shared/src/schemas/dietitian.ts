import { z } from "zod";
import { optionalCoerced } from "./common";

export const VerificationStatusSchema = z.enum(["PENDING", "VERIFIED", "REJECTED"]);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const DietitianPublicSummarySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  avatarUrl: z.string().nullable(),
  title: z.string().nullable(),
  bio: z.string().nullable(),
  specialties: z.array(z.string()),
  yearsOfExperience: z.number().int().nullable(),
  averageRating: z.number().nullable(),
  city: z.string().nullable(),
  verificationStatus: VerificationStatusSchema,
});
export type DietitianPublicSummary = z.infer<typeof DietitianPublicSummarySchema>;

// Diyetisyenin kendi profilini görüntülerken/düzenlerken kullandığı, iletişim bilgilerini de içeren şema.
export const DietitianProfileSchema = DietitianPublicSummarySchema.extend({
  email: z.string().email(),
  phone: z.string().nullable(),
  licenseNumber: z.string().nullable(),
  certificationUrls: z.array(z.string()),
});
export type DietitianProfile = z.infer<typeof DietitianProfileSchema>;

export const DietitianSearchInputSchema = z.object({
  query: z.string().min(1).max(100).optional(),
  specialty: z.string().min(1).max(100).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type DietitianSearchInput = z.infer<typeof DietitianSearchInputSchema>;

export const DietitianSearchResultSchema = z.object({
  items: z.array(DietitianPublicSummarySchema),
  total: z.number().int(),
});
export type DietitianSearchResult = z.infer<typeof DietitianSearchResultSchema>;

export const UpdateDietitianProfileInputSchema = z.object({
  title: optionalCoerced(z.string().min(1).max(100)),
  bio: optionalCoerced(z.string().min(1).max(2000)),
  specialties: z.array(z.string().min(1).max(50)).max(20).optional(),
  yearsOfExperience: optionalCoerced(z.coerce.number().int().min(0).max(70)),
  licenseNumber: optionalCoerced(z.string().min(1).max(50)),
  city: optionalCoerced(z.string().trim().min(1).max(80)),
});
export type UpdateDietitianProfileInput = z.infer<typeof UpdateDietitianProfileInputSchema>;

// Admin: diyetisyen doğrulama kuyruğu.
export const AdminListDietitiansInputSchema = z.object({
  status: VerificationStatusSchema.optional(),
});
export type AdminListDietitiansInput = z.infer<typeof AdminListDietitiansInputSchema>;

export const AdminVerifyDietitianInputSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["VERIFIED", "REJECTED"]),
});
export type AdminVerifyDietitianInput = z.infer<typeof AdminVerifyDietitianInputSchema>;

export const AddCertificationInputSchema = z.object({
  url: z.string().min(1).max(500),
});
export type AddCertificationInput = z.infer<typeof AddCertificationInputSchema>;

export const RemoveCertificationInputSchema = z.object({
  url: z.string().min(1).max(500),
});
export type RemoveCertificationInput = z.infer<typeof RemoveCertificationInputSchema>;

// Danışana uygunluk puanıyla önerilen diyetisyenler (şeffaf puan dökümü + gerekçeler).
// Puan yalnızca uygunluk ve kaliteye bağlıdır; komisyon/ödeme sıralamayı etkilemez.
export const RecommendedDietitiansInputSchema = z.object({
  limit: z.coerce.number().int().min(1).max(30).default(10),
});
export type RecommendedDietitiansInput = z.infer<typeof RecommendedDietitiansInputSchema>;

export const RecommendedDietitianSchema = DietitianPublicSummarySchema.extend({
  score: z.number().int().min(0).max(100),
  reasons: z.array(z.string()),
  breakdown: z.object({
    expertise: z.number(),
    access: z.number(),
    budget: z.number(),
    quality: z.number(),
    experience: z.number(),
  }),
  startingPrice: z.number().nullable(),
  sessionModes: z.array(z.enum(["ONLINE", "IN_PERSON"])),
  reviewCount: z.number().int(),
});
export type RecommendedDietitian = z.infer<typeof RecommendedDietitianSchema>;

export const RecommendedDietitiansResultSchema = z.object({
  items: z.array(RecommendedDietitianSchema),
  // false: danışan profilinde hedef/şehir/bütçe gibi bilgi yok; öneriler genel kaliteye göre.
  personalized: z.boolean(),
});
export type RecommendedDietitiansResult = z.infer<typeof RecommendedDietitiansResultSchema>;
