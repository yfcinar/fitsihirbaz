import { z } from "zod";
import { optionalCoerced } from "./common";

export const AppointmentTypeSchema = z.enum(["ONLINE", "IN_PERSON"]);
export type AppointmentType = z.infer<typeof AppointmentTypeSchema>;

export const AppointmentStatusSchema = z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]);
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;

// "counterpart" alanları görüntüleyen tarafa göre değişir: danışan için diyetisyen bilgisi,
// diyetisyen için danışan bilgisi döner.
export const AppointmentSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  dietitianId: z.string().uuid(),
  scheduledAt: z.string(),
  durationMinutes: z.number().int(),
  status: AppointmentStatusSchema,
  type: AppointmentTypeSchema,
  meetingLink: z.string().nullable(),
  // Seans hakkının düşüldüğü paket (manuel bağlı danışanlarda null).
  packageTitle: z.string().nullable(),
  counterpartFirstName: z.string(),
  counterpartLastName: z.string(),
});
export type Appointment = z.infer<typeof AppointmentSchema>;

export const CreateAppointmentInputSchema = z.object({
  dietitianId: z.string().uuid(),
  scheduledAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Geçerli bir tarih/saat girin"),
  durationMinutes: optionalCoerced(z.coerce.number().int().positive().max(480)),
  type: AppointmentTypeSchema.default("ONLINE"),
  meetingLink: z.string().url().optional(),
});
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentInputSchema>;

export const UpdateAppointmentStatusInputSchema = z.object({
  id: z.string().uuid(),
  status: AppointmentStatusSchema,
});
export type UpdateAppointmentStatusInput = z.infer<typeof UpdateAppointmentStatusInputSchema>;

export const CancelAppointmentInputSchema = z.object({
  id: z.string().uuid(),
});
export type CancelAppointmentInput = z.infer<typeof CancelAppointmentInputSchema>;

// Danışanın bir diyetisyenle olan paket seans bakiyesi (randevu alırken gösterilir).
export const SessionBalanceInputSchema = z.object({
  dietitianId: z.string().uuid(),
});
export type SessionBalanceInput = z.infer<typeof SessionBalanceInputSchema>;

export const SessionPackageBalanceSchema = z.object({
  orderId: z.string().uuid(),
  packageTitle: z.string(),
  sessionMode: z.enum(["ONLINE", "IN_PERSON", "BOTH"]),
  // null: pakette seans sayısı belirtilmemiş (sınırsız sayılır).
  sessionCount: z.number().int().nullable(),
  used: z.number().int(),
  remaining: z.number().int().nullable(),
  validUntil: z.string(),
  expired: z.boolean(),
});
export type SessionPackageBalance = z.infer<typeof SessionPackageBalanceSchema>;

export const SessionBalanceSchema = z.object({
  // false: danışan bu diyetisyene paket almadan (örn. diyetisyen elle ekleyerek) bağlı; kısıt yok.
  hasPackages: z.boolean(),
  packages: z.array(SessionPackageBalanceSchema),
  // Süresi dolmamış paketlerdeki toplam kalan seans; sınırsız paket varsa null.
  totalRemaining: z.number().int().nullable(),
});
export type SessionBalance = z.infer<typeof SessionBalanceSchema>;
