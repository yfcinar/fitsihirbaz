"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  SESSION_MODE_LABELS,
  UpdateClientProfileInputSchema,
  type ClientProfile,
  type SessionMode,
  type UpdateClientProfileInput,
} from "@fit-sihirbaz/shared";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const nativeSelectClass =
  "mt-1 h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

// Virgülle ayrılmış metin <-> dizi dönüşümü yapan giriş (hobiler, sporlar, alerjiler...).
function CommaListInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[] | undefined;
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState((value ?? []).join(", "));
  // Form dışarıdan sıfırlandığında (profil yüklenince) metni senkronla.
  useEffect(() => {
    setText((value ?? []).join(", "));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(value ?? []).join("|")]);

  return (
    <Input
      value={text}
      placeholder={placeholder}
      onChange={(event) => {
        setText(event.target.value);
        onChange(
          event.target.value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        );
      }}
    />
  );
}

function toFormValues(profile: ClientProfile): UpdateClientProfileInput {
  return {
    birthDate: profile.birthDate ?? "",
    gender: profile.gender ?? undefined,
    heightCm: profile.heightCm ?? undefined,
    goal: profile.goal ?? undefined,
    activityLevel: profile.activityLevel ?? undefined,
    medicalNotes: profile.medicalNotes ?? "",
    occupation: profile.occupation ?? "",
    hobbies: profile.hobbies,
    sports: profile.sports,
    dietaryPreferences: profile.dietaryPreferences,
    allergies: profile.allergies,
    currentWeightKg: profile.currentWeightKg ?? undefined,
    targetWeightKg: profile.targetWeightKg ?? undefined,
    city: profile.city ?? "",
    preferredSessionMode: profile.preferredSessionMode ?? undefined,
    maxBudgetTry: profile.maxBudgetTry ?? undefined,
  };
}

// Danışanın tanıtıcı/sağlık bilgileri: kayıttan hemen sonra (2. adım) ve profil sayfasında kullanılır.
// Bu bilgiler diyetisyen eşleştirme ve plan kişiselleştirme içindir; hepsi opsiyoneldir.
export function ClientDetailsForm({
  profile,
  title = "Sağlık ve Yaşam Tarzı Bilgileri",
  submitLabel = "Kaydet",
  onSaved,
  secondaryAction,
}: {
  profile: ClientProfile;
  title?: string;
  submitLabel?: string;
  onSaved?: () => void;
  secondaryAction?: React.ReactNode;
}) {
  const utils = trpc.useUtils();
  const form = useForm<UpdateClientProfileInput>({
    resolver: zodResolver(UpdateClientProfileInputSchema),
    defaultValues: toFormValues(profile),
  });
  const mutation = trpc.clients.updateProfile.useMutation({
    onSuccess: () => {
      utils.clients.getProfile.invalidate();
      onSaved?.();
    },
  });

  useEffect(() => {
    form.reset(toFormValues(profile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const { register, control, formState } = form;

  return (
    <form
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      className="flex flex-col gap-3 rounded-md border p-4"
    >
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="text-xs text-muted-foreground">
        Bu bilgiler size uygun diyetisyenleri sıralamak ve planınızı kişiselleştirmek için kullanılır. Tüm alanlar
        isteğe bağlıdır; dilediğiniz zaman değiştirebilirsiniz.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Doğum Tarihi</Label>
          <Input type="date" {...register("birthDate")} />
        </div>
        <div>
          <Label>Cinsiyet</Label>
          <select className={nativeSelectClass} {...register("gender")}>
            <option value="">Seçiniz</option>
            <option value="MALE">Erkek</option>
            <option value="FEMALE">Kadın</option>
            <option value="OTHER">Diğer</option>
          </select>
        </div>
        <div>
          <Label>Boy (cm)</Label>
          <Input type="number" {...register("heightCm")} />
        </div>
        <div>
          <Label>Şu Anki Kilo (kg)</Label>
          <Input type="number" step="0.1" {...register("currentWeightKg")} />
        </div>
        <div>
          <Label>Hedef Kilo (kg)</Label>
          <Input type="number" step="0.1" {...register("targetWeightKg")} />
        </div>
        <div>
          <Label>Hedef</Label>
          <select className={nativeSelectClass} {...register("goal")}>
            <option value="">Seçiniz</option>
            <option value="WEIGHT_LOSS">Kilo Verme</option>
            <option value="WEIGHT_GAIN">Kilo Alma</option>
            <option value="MAINTENANCE">Koruma</option>
            <option value="MUSCLE_GAIN">Kas Kazanma</option>
            <option value="MEDICAL">Tıbbi</option>
          </select>
        </div>
        <div>
          <Label>Aktivite Seviyesi</Label>
          <select className={nativeSelectClass} {...register("activityLevel")}>
            <option value="">Seçiniz</option>
            <option value="SEDENTARY">Hareketsiz</option>
            <option value="LIGHT">Hafif</option>
            <option value="MODERATE">Orta</option>
            <option value="ACTIVE">Aktif</option>
            <option value="VERY_ACTIVE">Çok Aktif</option>
          </select>
        </div>
        <div>
          <Label>Meslek</Label>
          <Input {...register("occupation")} placeholder="örn. Öğretmen" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Spor / Egzersiz (virgülle ayırın)</Label>
        <Controller
          control={control}
          name="sports"
          render={({ field }) => (
            <CommaListInput value={field.value} onChange={field.onChange} placeholder="örn. Yüzme, Yürüyüş" />
          )}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Hobiler (virgülle ayırın)</Label>
        <Controller
          control={control}
          name="hobbies"
          render={({ field }) => (
            <CommaListInput value={field.value} onChange={field.onChange} placeholder="örn. Kitap okumak, Yemek yapmak" />
          )}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Beslenme Tercihleri (virgülle ayırın)</Label>
        <Controller
          control={control}
          name="dietaryPreferences"
          render={({ field }) => (
            <CommaListInput value={field.value} onChange={field.onChange} placeholder="örn. Vejetaryen, Glutensiz" />
          )}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Alerjiler / İntoleranslar (virgülle ayırın)</Label>
        <Controller
          control={control}
          name="allergies"
          render={({ field }) => (
            <CommaListInput value={field.value} onChange={field.onChange} placeholder="örn. Fıstık, Laktoz" />
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Sağlık Notları (hastalık, ilaç vb.)</Label>
        <Textarea rows={3} {...register("medicalNotes")} />
      </div>

      <h3 className="mt-2 text-sm font-semibold text-foreground">Diyetisyen Tercihleri</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Şehir</Label>
          <Input {...register("city")} placeholder="örn. İzmir" />
        </div>
        <div>
          <Label>Görüşme Tercihi</Label>
          <select className={nativeSelectClass} {...register("preferredSessionMode")}>
            <option value="">Fark etmez</option>
            {(Object.keys(SESSION_MODE_LABELS) as SessionMode[])
              .filter((mode) => mode !== "BOTH")
              .map((mode) => (
                <option key={mode} value={mode}>
                  {SESSION_MODE_LABELS[mode]}
                </option>
              ))}
          </select>
        </div>
        <div>
          <Label>Azami Bütçe (TRY)</Label>
          <Input type="number" {...register("maxBudgetTry")} placeholder="örn. 2000" />
        </div>
      </div>

      {Object.keys(formState.errors).length > 0 && (
        <p className="text-sm text-destructive">Lütfen işaretli alanları kontrol edin.</p>
      )}
      {mutation.error && <p className="text-sm text-destructive">{mutation.error.message}</p>}
      {mutation.isSuccess && <p className="text-sm text-primary">Kaydedildi.</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={mutation.isLoading}>
          {mutation.isLoading ? "Kaydediliyor..." : submitLabel}
        </Button>
        {secondaryAction}
      </div>
    </form>
  );
}
