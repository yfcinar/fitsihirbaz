"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RegisterInputSchema, type RegisterInput } from "@fit-sihirbaz/shared";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/lib/auth-store";
import { ClientDetailsForm } from "@/components/profile/ClientDetailsForm";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function RegisterForm() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);
  // Danışan kaydı iki adımlıdır: 1) hesap + rızalar, 2) diyetisyen eşleştirme için ayrıntılı bilgiler.
  const [step, setStep] = useState<"account" | "details">("account");
  const registerMutation = trpc.auth.register.useMutation();

  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterInputSchema),
    defaultValues: {
      role: "CLIENT",
      consents: { privacyNotice: false as unknown as true, termsOfService: false as unknown as true, healthDataExplicit: false },
    },
  });
  const role = watch("role");

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    try {
      const result = await registerMutation.mutateAsync(values);
      setSession(result.user, result.tokens.accessToken);
      if (values.role === "CLIENT") {
        setStep("details");
        return;
      }
      router.push("/diyetisyen/profil");
      router.refresh();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Kayıt başarısız oldu");
    }
  }

  if (step === "details") {
    return <RegisterDetailsStep onDone={() => router.push("/danisan/gunluk")} />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <Label>Hesap türü</Label>
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="CLIENT" /> Danışan
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="DIETITIAN" /> Diyetisyen
              </label>
            </RadioGroup>
          )}
        />
        {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">Ad</Label>
          <Input id="firstName" {...register("firstName")} />
          {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Soyad</Label>
          <Input id="lastName" {...register("lastName")} />
          {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">E-posta</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Telefon (opsiyonel)</Label>
        <Input id="phone" type="tel" autoComplete="tel" {...register("phone")} />
        {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Şifre</Label>
        <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>

      <fieldset className="space-y-3 rounded-md border p-3">
        <legend className="px-1 text-sm font-medium text-foreground">Onaylar</legend>

        <Controller
          control={control}
          name="consents.privacyNotice"
          render={({ field }) => (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={field.value === true}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                className="mt-0.5"
              />
              <span>
                <Link href="/kvkk-aydinlatma" target="_blank" className="text-primary hover:underline">
                  KVKK Aydınlatma Metni
                </Link>
                &apos;ni okudum, anladım.
              </span>
            </label>
          )}
        />
        {errors.consents?.privacyNotice && (
          <p className="text-sm text-destructive">{errors.consents.privacyNotice.message}</p>
        )}

        <Controller
          control={control}
          name="consents.termsOfService"
          render={({ field }) => (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={field.value === true}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                className="mt-0.5"
              />
              <span>
                <Link href="/kullanim-kosullari" target="_blank" className="text-primary hover:underline">
                  Kullanım Koşulları
                </Link>
                &apos;nı kabul ediyorum.
              </span>
            </label>
          )}
        />
        {errors.consents?.termsOfService && (
          <p className="text-sm text-destructive">{errors.consents.termsOfService.message}</p>
        )}

        {role === "CLIENT" && (
          <>
            <Controller
              control={control}
              name="consents.healthDataExplicit"
              render={({ field }) => (
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={field.value === true}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    className="mt-0.5"
                  />
                  <span>
                    Sağlık verilerimin (kilo, ölçüm, beslenme ve sağlık bilgilerim) diyet hizmetinin sunulması ve bağlı
                    olduğum diyetisyen tarafından takibi amacıyla işlenmesine <strong>açık rıza</strong> veriyorum.
                    Rızamı dilediğim zaman geri çekebileceğimi biliyorum.
                  </span>
                </label>
              )}
            />
            {errors.consents?.healthDataExplicit && (
              <p className="text-sm text-destructive">{errors.consents.healthDataExplicit.message}</p>
            )}
          </>
        )}
      </fieldset>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Kayıt oluşturuluyor..." : role === "CLIENT" ? "Devam Et" : "Kayıt Ol"}
      </Button>
    </form>
  );
}

function RegisterDetailsStep({ onDone }: { onDone: () => void }) {
  const profileQuery = trpc.clients.getProfile.useQuery();

  if (profileQuery.isLoading || !profileQuery.data) {
    return <p className="text-center text-muted-foreground">{profileQuery.isError ? profileQuery.error.message : "Yükleniyor..."}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-foreground/90">
        Hesabınız oluşturuldu! Size en uygun diyetisyenleri bulabilmemiz için kendinizden biraz bahsedin. Bu adımı
        atlayıp daha sonra profilinizden de doldurabilirsiniz.
      </p>
      <ClientDetailsForm
        profile={profileQuery.data}
        title="Sizi Tanıyalım"
        submitLabel="Kaydet ve Başla"
        onSaved={onDone}
        secondaryAction={
          <Button type="button" variant="ghost" onClick={onDone}>
            Şimdilik atla
          </Button>
        }
      />
    </div>
  );
}
