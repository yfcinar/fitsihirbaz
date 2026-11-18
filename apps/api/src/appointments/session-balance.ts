import type { AppointmentType, SessionBalance, SessionMode } from "@fit-sihirbaz/shared";

const DAY_MS = 86_400_000;

// Bakiye hesabı için gereken minimum sipariş şekli: ödenmiş siparişin paketi ve iptal
// edilmemiş (SCHEDULED/COMPLETED/NO_SHOW) randevuları. İptal edilen randevu hakkı geri verir.
export interface BalanceOrder {
  id: string;
  createdAt: Date;
  package: { title: string; durationDays: number; sessionCount: number | null; sessionMode: SessionMode };
  appointments: Array<unknown>;
}

function validUntil(order: BalanceOrder): Date {
  return new Date(order.createdAt.getTime() + order.package.durationDays * DAY_MS);
}

function remainingOf(order: BalanceOrder): number | null {
  const count = order.package.sessionCount;
  return count === null ? null : Math.max(0, count - order.appointments.length);
}

export function modeAllows(mode: SessionMode, type: AppointmentType): boolean {
  return mode === "BOTH" || mode === type;
}

export function computeBalance(orders: BalanceOrder[], now: Date): SessionBalance {
  const packages = orders.map((order) => {
    const until = validUntil(order);
    return {
      orderId: order.id,
      packageTitle: order.package.title,
      sessionMode: order.package.sessionMode,
      sessionCount: order.package.sessionCount,
      used: order.appointments.length,
      remaining: remainingOf(order),
      validUntil: until.toISOString(),
      expired: until.getTime() < now.getTime(),
    };
  });

  const live = packages.filter((pkg) => !pkg.expired);
  const totalRemaining = live.some((pkg) => pkg.remaining === null)
    ? null
    : live.reduce((sum, pkg) => sum + (pkg.remaining ?? 0), 0);

  return { hasPackages: packages.length > 0, packages, totalRemaining };
}

export type PickResult =
  | { kind: "ok"; order: BalanceOrder }
  | { kind: "no-packages" }
  | { kind: "mode-not-allowed" }
  | { kind: "expired" }
  | { kind: "no-sessions" };

// Yeni randevunun seans hakkının düşüleceği siparişi seçer: tür uyumlu, randevu tarihinde süresi
// dolmamış ve hakkı kalmış en eski sipariş. Hiç paketi olmayan (diyetisyenin elle eklediği)
// danışan için kısıt uygulanmaz ("no-packages").
export function pickOrderForBooking(orders: BalanceOrder[], type: AppointmentType, scheduledAt: Date): PickResult {
  if (orders.length === 0) {
    return { kind: "no-packages" };
  }
  const modeCompatible = orders.filter((order) => modeAllows(order.package.sessionMode, type));
  if (modeCompatible.length === 0) {
    return { kind: "mode-not-allowed" };
  }
  const unexpired = modeCompatible.filter((order) => validUntil(order).getTime() >= scheduledAt.getTime());
  if (unexpired.length === 0) {
    return { kind: "expired" };
  }
  const withSessions = unexpired
    .filter((order) => {
      const remaining = remainingOf(order);
      return remaining === null || remaining > 0;
    })
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  if (withSessions.length === 0) {
    return { kind: "no-sessions" };
  }
  return { kind: "ok", order: withSessions[0] };
}
