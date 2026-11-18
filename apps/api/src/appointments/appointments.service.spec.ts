import { AppointmentsService } from "./appointments.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { AppointmentReminderQueue } from "../jobs/appointment-reminder.queue";
import {
  AppointmentAccessDeniedError,
  AppointmentNotFoundError,
  ClientNotLinkedError,
  NoSessionsRemainingError,
  SessionModeNotAllowedError,
  SessionPackageExpiredError,
} from "./appointments.errors";

function buildAppointmentRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "appt-1",
    clientId: "client-1",
    dietitianId: "dietitian-1",
    scheduledAt: new Date("2026-07-15T14:30:00Z"),
    durationMinutes: 30,
    status: "SCHEDULED",
    meetingLink: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    client: { id: "client-1", userId: "client-user-1", user: { firstName: "Ali", lastName: "Veli" } },
    dietitian: { id: "dietitian-1", userId: "dyt-user-1", user: { firstName: "Ayşe", lastName: "Yılmaz" } },
    ...overrides,
  };
}

describe("AppointmentsService", () => {
  let prisma: {
    clientProfile: { findUnique: jest.Mock };
    dietitianProfile: { findUnique: jest.Mock };
    clientDietitianLink: { findFirst: jest.Mock };
    order: { findMany: jest.Mock };
    appointment: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock; findMany: jest.Mock };
  };
  let notifications: { create: jest.Mock };
  let reminderQueue: { scheduleReminder: jest.Mock; cancelReminder: jest.Mock };
  let service: AppointmentsService;

  beforeEach(() => {
    prisma = {
      clientProfile: { findUnique: jest.fn() },
      dietitianProfile: { findUnique: jest.fn() },
      clientDietitianLink: { findFirst: jest.fn() },
      order: { findMany: jest.fn().mockResolvedValue([]) },
      appointment: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    };
    notifications = { create: jest.fn() };
    reminderQueue = { scheduleReminder: jest.fn(), cancelReminder: jest.fn() };
    service = new AppointmentsService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
      reminderQueue as unknown as AppointmentReminderQueue,
    );
  });

  describe("create", () => {
    it("bağlı olmayan diyetisyen için ClientNotLinkedError fırlatır", async () => {
      prisma.clientProfile.findUnique.mockResolvedValue({ id: "client-1" });
      prisma.clientDietitianLink.findFirst.mockResolvedValue(null);

      await expect(
        service.create("client-user-1", { dietitianId: "dietitian-1", scheduledAt: "2026-07-15T14:30", type: "ONLINE" }),
      ).rejects.toBeInstanceOf(ClientNotLinkedError);
    });

    it("bağlı diyetisyen için SCHEDULED randevu oluşturur", async () => {
      prisma.clientProfile.findUnique.mockResolvedValue({ id: "client-1" });
      prisma.clientDietitianLink.findFirst.mockResolvedValue({ id: "link-1" });
      prisma.appointment.create.mockResolvedValue(buildAppointmentRow());

      const result = await service.create("client-user-1", {
        dietitianId: "dietitian-1",
        scheduledAt: "2026-07-15T14:30",
        type: "ONLINE",
      });
      expect(result.status).toBe("SCHEDULED");
      expect(result.counterpartFirstName).toBe("Ayşe");
      expect(notifications.create).toHaveBeenCalledWith(
        "dyt-user-1",
        "APPOINTMENT_REQUESTED",
        expect.objectContaining({ appointmentId: "appt-1" }),
      );
      expect(reminderQueue.scheduleReminder).toHaveBeenCalledWith("appt-1", expect.any(Date));
    });
  });

  describe("create: paket seans hakkı", () => {
    const BOOKING = { dietitianId: "dietitian-1", scheduledAt: "2026-07-15T14:30", type: "ONLINE" as const };

    function paidOrder(overrides: Record<string, unknown> = {}, pkg: Record<string, unknown> = {}) {
      return {
        id: "order-1",
        createdAt: new Date("2026-07-01T00:00:00Z"),
        package: { title: "3 Aylık", durationDays: 90, sessionCount: 2, sessionMode: "BOTH", ...pkg },
        appointments: [],
        ...overrides,
      };
    }

    beforeEach(() => {
      prisma.clientProfile.findUnique.mockResolvedValue({ id: "client-1" });
      prisma.clientDietitianLink.findFirst.mockResolvedValue({ id: "link-1" });
      prisma.appointment.create.mockResolvedValue(buildAppointmentRow());
    });

    it("hakkı olan paketten düşer ve randevuyu siparişe bağlar", async () => {
      prisma.order.findMany.mockResolvedValue([paidOrder({ appointments: [{ id: "a1" }] })]);

      await service.create("client-user-1", BOOKING);

      expect(prisma.appointment.create.mock.calls[0][0].data).toMatchObject({ orderId: "order-1", type: "ONLINE" });
    });

    it("hiç paketi olmayan (elle eklenmiş) danışan için kısıtlama uygulanmaz ve orderId null olur", async () => {
      prisma.order.findMany.mockResolvedValue([]);

      await service.create("client-user-1", BOOKING);

      expect(prisma.appointment.create.mock.calls[0][0].data.orderId).toBeNull();
    });

    it("kalan hakkı bitmişse NoSessionsRemainingError fırlatır ve randevu oluşturmaz", async () => {
      prisma.order.findMany.mockResolvedValue([paidOrder({ appointments: [{ id: "a1" }, { id: "a2" }] })]);

      await expect(service.create("client-user-1", BOOKING)).rejects.toBeInstanceOf(NoSessionsRemainingError);
      expect(prisma.appointment.create).not.toHaveBeenCalled();
    });

    it("paket yüz yüze seansı kapsamıyorsa SessionModeNotAllowedError fırlatır", async () => {
      prisma.order.findMany.mockResolvedValue([paidOrder({}, { sessionMode: "ONLINE" })]);

      await expect(service.create("client-user-1", { ...BOOKING, type: "IN_PERSON" })).rejects.toBeInstanceOf(
        SessionModeNotAllowedError,
      );
    });

    it("paketin süresi randevu tarihinden önce dolmuşsa SessionPackageExpiredError fırlatır", async () => {
      prisma.order.findMany.mockResolvedValue([paidOrder({}, { durationDays: 7 })]);

      await expect(service.create("client-user-1", BOOKING)).rejects.toBeInstanceOf(SessionPackageExpiredError);
    });

    it("sayı belirtilmemiş (sınırsız) pakette hak bitmez", async () => {
      prisma.order.findMany.mockResolvedValue([
        paidOrder({ appointments: [{ id: "a1" }, { id: "a2" }, { id: "a3" }] }, { sessionCount: null }),
      ]);

      await expect(service.create("client-user-1", BOOKING)).resolves.toBeDefined();
    });

    it("hakkı biten ilk paket yerine ikinci paketten düşer", async () => {
      prisma.order.findMany.mockResolvedValue([
        paidOrder({ id: "order-eski", appointments: [{ id: "a1" }, { id: "a2" }] }),
        paidOrder({ id: "order-yeni", createdAt: new Date("2026-07-05T00:00:00Z") }),
      ]);

      await service.create("client-user-1", BOOKING);

      expect(prisma.appointment.create.mock.calls[0][0].data.orderId).toBe("order-yeni");
    });
  });

  describe("getSessionBalance", () => {
    it("kalan seansları ve paket detaylarını döner", async () => {
      prisma.clientProfile.findUnique.mockResolvedValue({ id: "client-1" });
      prisma.order.findMany.mockResolvedValue([
        {
          id: "order-1",
          createdAt: new Date(),
          package: { title: "3 Aylık", durationDays: 90, sessionCount: 4, sessionMode: "ONLINE" },
          appointments: [{ id: "a1" }],
        },
      ]);

      const result = await service.getSessionBalance("client-user-1", "dietitian-1");

      expect(result).toMatchObject({ hasPackages: true, totalRemaining: 3 });
      expect(result.packages[0]).toMatchObject({ used: 1, remaining: 3, sessionMode: "ONLINE", expired: false });
    });
  });

  describe("updateStatus", () => {
    it("başka bir diyetisyenin randevusu için AppointmentAccessDeniedError fırlatır", async () => {
      prisma.dietitianProfile.findUnique.mockResolvedValue({ id: "dietitian-1" });
      prisma.appointment.findUnique.mockResolvedValue(buildAppointmentRow({ dietitianId: "baska-dietitian" }));

      await expect(
        service.updateStatus("dyt-user-1", { id: "appt-1", status: "COMPLETED" }),
      ).rejects.toBeInstanceOf(AppointmentAccessDeniedError);
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });

    it("randevu yoksa AppointmentNotFoundError fırlatır", async () => {
      prisma.dietitianProfile.findUnique.mockResolvedValue({ id: "dietitian-1" });
      prisma.appointment.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus("dyt-user-1", { id: "yok", status: "COMPLETED" }),
      ).rejects.toBeInstanceOf(AppointmentNotFoundError);
    });

    it("sahibi olduğu randevunun durumunu günceller", async () => {
      prisma.dietitianProfile.findUnique.mockResolvedValue({ id: "dietitian-1" });
      prisma.appointment.findUnique.mockResolvedValue(buildAppointmentRow());
      prisma.appointment.update.mockResolvedValue(buildAppointmentRow({ status: "COMPLETED" }));

      const result = await service.updateStatus("dyt-user-1", { id: "appt-1", status: "COMPLETED" });
      expect(result.status).toBe("COMPLETED");
      expect(notifications.create).toHaveBeenCalledWith(
        "client-user-1",
        "APPOINTMENT_STATUS_CHANGED",
        expect.objectContaining({ appointmentId: "appt-1" }),
      );
      expect(reminderQueue.cancelReminder).toHaveBeenCalledWith("appt-1");
    });
  });

  describe("cancel", () => {
    it("başkasının randevusunu iptal etmeye çalışan danışanı reddeder", async () => {
      prisma.appointment.findUnique.mockResolvedValue(buildAppointmentRow());
      prisma.clientProfile.findUnique.mockResolvedValue({ id: "baska-client" });

      await expect(service.cancel("client-user-1", "CLIENT", "appt-1")).rejects.toBeInstanceOf(
        AppointmentAccessDeniedError,
      );
    });

    it("kendi randevusunu iptal edebilir", async () => {
      prisma.appointment.findUnique.mockResolvedValue(buildAppointmentRow());
      prisma.clientProfile.findUnique.mockResolvedValue({ id: "client-1" });
      prisma.appointment.update.mockResolvedValue(buildAppointmentRow({ status: "CANCELLED" }));

      const result = await service.cancel("client-user-1", "CLIENT", "appt-1");
      expect(result.status).toBe("CANCELLED");
      expect(reminderQueue.cancelReminder).toHaveBeenCalledWith("appt-1");
    });
  });
});
