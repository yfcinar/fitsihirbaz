import type { Goal, ShowcaseTransformation } from "@fit-sihirbaz/shared";

export interface ShowcaseLog {
  logDate: Date;
  weightKg: number | null;
  photoUrls: string[];
}

export interface ShowcaseSubject {
  firstName: string;
  lastName: string;
  goal: Goal | null;
}

export const MIN_WEIGHT_LOGS = 2;

const DAY_MS = 86_400_000;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

// Anonim izinde isim hiç gösterilmez; aksi halde "Ayşe K." (soyadın baş harfi).
export function displayName(subject: ShowcaseSubject, anonymous: boolean): string {
  if (anonymous) return "Anonim danışan";
  const initial = subject.lastName.trim()[0];
  return initial ? `${subject.firstName.trim()} ${initial.toLocaleUpperCase("tr-TR")}.` : subject.firstName.trim();
}

export function weightLogs(logs: ShowcaseLog[]): ShowcaseLog[] {
  return logs
    .filter((log) => log.weightKg !== null)
    .sort((a, b) => a.logDate.getTime() - b.logDate.getTime());
}

// Yalnızca toplulaştırılmış değişim döner: not, ölçüler, tıbbi bilgi veya ara kayıtlar asla dahil edilmez.
export function buildTransformation(
  subject: ShowcaseSubject,
  logs: ShowcaseLog[],
  options: { anonymous: boolean; includePhotos: boolean },
): ShowcaseTransformation | null {
  const weighed = weightLogs(logs);
  if (weighed.length < MIN_WEIGHT_LOGS) return null;

  const first = weighed[0];
  const last = weighed[weighed.length - 1];
  const start = first.weightKg as number;
  const current = last.weightKg as number;
  const change = current - start;

  const photoLogs = logs
    .filter((log) => log.photoUrls.length > 0)
    .sort((a, b) => a.logDate.getTime() - b.logDate.getTime());

  return {
    displayName: displayName(subject, options.anonymous),
    goal: subject.goal,
    durationDays: Math.round((last.logDate.getTime() - first.logDate.getTime()) / DAY_MS),
    startWeightKg: round1(start),
    currentWeightKg: round1(current),
    changeKg: round1(change),
    changePercent: start > 0 ? round1((change / start) * 100) : 0,
    beforePhotoUrl: options.includePhotos && photoLogs.length >= 2 ? photoLogs[0].photoUrls[0] : null,
    afterPhotoUrl: options.includePhotos && photoLogs.length >= 2 ? photoLogs[photoLogs.length - 1].photoUrls[0] : null,
  };
}
