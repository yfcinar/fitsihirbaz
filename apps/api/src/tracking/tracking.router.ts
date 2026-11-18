import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  AckResponseSchema,
  AddDayCommentInputSchema,
  AddFoodEntryInputSchema,
  AddWaterInputSchema,
  DayCommentSchema,
  DeleteEntryInputSchema,
  FoodEntrySchema,
  GetTrackingDayInputSchema,
  SetMealItemStatusInputSchema,
  TrackingDaySchema,
  TrackingDaySummarySchema,
  TrackingRangeInputSchema,
  WaterEntrySchema,
} from "@fit-sihirbaz/shared";
import { clientProcedure, dietitianProcedure, protectedProcedure, router } from "../trpc/trpc";
import type { TrackingService } from "./tracking.service";
import {
  ClientProfileNotFoundError,
  DietitianProfileNotFoundError,
  EntryNotFoundError,
  FoodNotFoundError,
  FutureDateNotAllowedError,
  MealItemDateMismatchError,
  MealItemNotFoundError,
  MissingClientIdError,
  TrackingAccessDeniedError,
} from "./tracking.errors";

function mapTrackingError(error: unknown): never {
  if (error instanceof ClientProfileNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Danışan profili bulunamadı" });
  }
  if (error instanceof DietitianProfileNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Diyetisyen profili bulunamadı" });
  }
  if (error instanceof MealItemNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Öğün kalemi bulunamadı" });
  }
  if (error instanceof FoodNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Besin bulunamadı" });
  }
  if (error instanceof EntryNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Kayıt bulunamadı" });
  }
  if (error instanceof TrackingAccessDeniedError) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Bu danışanın takip verilerine erişiminiz yok" });
  }
  if (error instanceof MissingClientIdError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "clientId zorunlu" });
  }
  if (error instanceof MealItemDateMismatchError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Tarih, planın bu günüyle uyuşmuyor" });
  }
  if (error instanceof FutureDateNotAllowedError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Gelecek bir güne kayıt girilemez" });
  }
  throw error;
}

export function createTrackingRouter(service: TrackingService) {
  return router({
    setMealItemStatus: clientProcedure
      .input(SetMealItemStatusInputSchema)
      .output(AckResponseSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await service.setMealItemStatus(ctx.user.id, input);
        } catch (error) {
          mapTrackingError(error);
        }
      }),

    addFoodEntry: clientProcedure
      .input(AddFoodEntryInputSchema)
      .output(FoodEntrySchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await service.addFoodEntry(ctx.user.id, input);
        } catch (error) {
          mapTrackingError(error);
        }
      }),

    deleteFoodEntry: clientProcedure
      .input(DeleteEntryInputSchema)
      .output(AckResponseSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await service.deleteFoodEntry(ctx.user.id, input.id);
        } catch (error) {
          mapTrackingError(error);
        }
      }),

    addWater: clientProcedure
      .input(AddWaterInputSchema)
      .output(WaterEntrySchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await service.addWater(ctx.user.id, input);
        } catch (error) {
          mapTrackingError(error);
        }
      }),

    deleteWater: clientProcedure
      .input(DeleteEntryInputSchema)
      .output(AckResponseSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await service.deleteWater(ctx.user.id, input.id);
        } catch (error) {
          mapTrackingError(error);
        }
      }),

    // Danışan kendi gününü, diyetisyen bağlı olduğu danışanın gününü görür (aynı şekil).
    getDay: protectedProcedure
      .input(GetTrackingDayInputSchema)
      .output(TrackingDaySchema)
      .query(async ({ ctx, input }) => {
        try {
          return await service.getDay(ctx.user.id, ctx.user.role, input);
        } catch (error) {
          mapTrackingError(error);
        }
      }),

    getRange: dietitianProcedure
      .input(TrackingRangeInputSchema)
      .output(z.array(TrackingDaySummarySchema))
      .query(async ({ ctx, input }) => {
        try {
          return await service.getRange(ctx.user.id, input);
        } catch (error) {
          mapTrackingError(error);
        }
      }),

    addComment: dietitianProcedure
      .input(AddDayCommentInputSchema)
      .output(DayCommentSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await service.addComment(ctx.user.id, input);
        } catch (error) {
          mapTrackingError(error);
        }
      }),
  });
}
