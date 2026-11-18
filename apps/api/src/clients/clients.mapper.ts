import type { ClientProfile as ClientProfileRow, User } from "@fit-sihirbaz/db";
import type { ClientProfile } from "@fit-sihirbaz/shared";

type ClientProfileWithUser = ClientProfileRow & { user: User };

export function toClientProfile(row: ClientProfileWithUser): ClientProfile {
  return {
    id: row.id,
    userId: row.userId,
    firstName: row.user.firstName,
    lastName: row.user.lastName,
    email: row.user.email,
    phone: row.user.phone,
    avatarUrl: row.user.avatarUrl,
    birthDate: row.birthDate ? row.birthDate.toISOString().slice(0, 10) : null,
    gender: row.gender,
    heightCm: row.heightCm === null ? null : Number(row.heightCm),
    goal: row.goal,
    activityLevel: row.activityLevel,
    medicalNotes: row.medicalNotes,
    occupation: row.occupation,
    hobbies: row.hobbies,
    sports: row.sports,
    dietaryPreferences: row.dietaryPreferences,
    allergies: row.allergies,
    currentWeightKg: row.currentWeightKg === null ? null : Number(row.currentWeightKg),
    targetWeightKg: row.targetWeightKg === null ? null : Number(row.targetWeightKg),
    city: row.city,
    preferredSessionMode: row.preferredSessionMode,
    maxBudgetTry: row.maxBudgetTry,
  };
}
