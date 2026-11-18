import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  AckResponseSchema,
  ListShowcaseInputSchema,
  MyShowcaseConsentSchema,
  RequestShowcaseConsentInputSchema,
  SetShowcaseConsentInputSchema,
  ShowcaseTransformationSchema,
} from "@fit-sihirbaz/shared";
import { clientProcedure, dietitianProcedure, publicProcedure, router } from "../trpc/trpc";
import type { ShowcaseService } from "./showcase.service";
import {
  ClientProfileNotFoundError,
  DietitianProfileNotFoundError,
  ShowcaseAlreadyActiveError,
  ShowcaseNotEligibleError,
  ShowcaseNotLinkedError,
} from "./showcase.errors";

function mapShowcaseError(error: unknown): never {
  if (error instanceof ClientProfileNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Danışan profili bulunamadı" });
  }
  if (error instanceof DietitianProfileNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Diyetisyen profili bulunamadı" });
  }
  if (error instanceof ShowcaseNotLinkedError) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Bu diyetisyenle bir bağlantınız yok" });
  }
  if (error instanceof ShowcaseNotEligibleError) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Değişiminizi paylaşabilmek için en az iki kilo ölçümü girmiş olmalısınız",
    });
  }
  if (error instanceof ShowcaseAlreadyActiveError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Bu danışan zaten vitrin izni vermiş" });
  }
  throw error;
}

export function createShowcaseRouter(service: ShowcaseService) {
  return router({
    // Herkese açık: yalnızca izin veren danışanların toplulaştırılmış değişimi.
    listForDietitian: publicProcedure
      .input(ListShowcaseInputSchema)
      .output(z.array(ShowcaseTransformationSchema))
      .query(({ input }) => service.listForDietitian(input.dietitianId)),

    myConsents: clientProcedure.output(z.array(MyShowcaseConsentSchema)).query(async ({ ctx }) => {
      try {
        return await service.myConsents(ctx.user.id);
      } catch (error) {
        mapShowcaseError(error);
      }
    }),

    setConsent: clientProcedure
      .input(SetShowcaseConsentInputSchema)
      .output(z.array(MyShowcaseConsentSchema))
      .mutation(async ({ ctx, input }) => {
        try {
          return await service.setConsent(ctx.user.id, input);
        } catch (error) {
          mapShowcaseError(error);
        }
      }),

    requestConsent: dietitianProcedure
      .input(RequestShowcaseConsentInputSchema)
      .output(AckResponseSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await service.requestConsent(ctx.user.id, input.clientId);
        } catch (error) {
          mapShowcaseError(error);
        }
      }),
  });
}
