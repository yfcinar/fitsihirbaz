"use client";

import { useState } from "react";
import { APPOINTMENT_TYPE_LABELS, SESSION_MODE_LABELS, type AppointmentType } from "@fit-sihirbaz/shared";
import { trpc } from "@/lib/trpc";
import { QueryErrorNotice } from "@/components/QueryErrorNotice";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Planlandı",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
  NO_SHOW: "Gelinmedi",
};

export default function DanisanRandevularPage() {
  const utils = trpc.useUtils();
  const appointmentsQuery = trpc.appointments.listForClient.useQuery();
  const dietitiansQuery = trpc.clients.getMyDietitians.useQuery();
  const [dietitianId, setDietitianId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [type, setType] = useState<AppointmentType>("ONLINE");
  const balanceQuery = trpc.appointments.sessionBalance.useQuery({ dietitianId }, { enabled: !!dietitianId });
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = trpc.appointments.create.useMutation({
    onSuccess: () => {
      setFormError(null);
      setScheduledAt("");
      utils.appointments.listForClient.invalidate();
      utils.appointments.sessionBalance.invalidate();
    },
    onError: (err) => setFormError(err.message),
  });

  const cancelMutation = trpc.appointments.cancel.useMutation({
    onSuccess: () => {
      utils.appointments.listForClient.invalidate();
      utils.appointments.sessionBalance.invalidate();
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    createMutation.mutate({ dietitianId, scheduledAt, type });
  }

  const dietitians = dietitiansQuery.data ?? [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Randevularım</h1>

      {dietitians.length === 0 ? (
        <p className="mb-6 text-muted-foreground">Randevu talep edebilmek için önce bir diyetisyene bağlı olmalısınız.</p>
      ) : (
        <form onSubmit={handleSubmit} className="mb-8 flex flex-wrap items-end gap-3 rounded-md border p-4">
          <div className="space-y-1.5">
            <Label>Diyetisyen</Label>
            <Select required value={dietitianId} onValueChange={setDietitianId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Seçin" />
              </SelectTrigger>
              <SelectContent>
                {dietitians.map((dietitian) => (
                  <SelectItem key={dietitian.id} value={dietitian.id}>
                    {dietitian.firstName} {dietitian.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tarih/Saat</Label>
            <Input
              required
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              className="w-56"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Görüşme Türü</Label>
            <Select value={type} onValueChange={(value) => setType(value as AppointmentType)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(APPOINTMENT_TYPE_LABELS) as AppointmentType[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {APPOINTMENT_TYPE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={createMutation.isLoading}>
            {createMutation.isLoading ? "Talep ediliyor..." : "Randevu Talep Et"}
          </Button>
          {balanceQuery.data?.hasPackages && (
            <ul className="w-full space-y-1 text-sm text-foreground/90">
              {balanceQuery.data.packages.map((pkg) => (
                <li key={pkg.orderId}>
                  {pkg.packageTitle} ({SESSION_MODE_LABELS[pkg.sessionMode]}):{" "}
                  {pkg.expired
                    ? "süresi doldu"
                    : pkg.remaining === null
                      ? "sınırsız görüşme"
                      : `${pkg.remaining}/${pkg.sessionCount} görüşme hakkı kaldı`}
                  {!pkg.expired && ` · ${new Date(pkg.validUntil).toLocaleDateString("tr-TR")} tarihine kadar geçerli`}
                </li>
              ))}
            </ul>
          )}
          {formError && <p className="w-full text-sm text-destructive">{formError}</p>}
        </form>
      )}

      {appointmentsQuery.isError && (
        <QueryErrorNotice message={appointmentsQuery.error.message} onRetry={() => appointmentsQuery.refetch()} />
      )}

      <ul className="divide-y rounded-md border">
        {appointmentsQuery.data?.map((appointment) => (
          <li key={appointment.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-foreground">
                {appointment.counterpartFirstName} {appointment.counterpartLastName}
              </p>
              <p className="text-sm text-muted-foreground">
                {new Date(appointment.scheduledAt).toLocaleString("tr-TR")} · {APPOINTMENT_TYPE_LABELS[appointment.type]} · {STATUS_LABELS[appointment.status]}
                {appointment.packageTitle ? ` · ${appointment.packageTitle}` : ""}
              </p>
            </div>
            {appointment.status === "SCHEDULED" && (
              <Button variant="outline" size="sm" onClick={() => cancelMutation.mutate({ id: appointment.id })}>
                İptal Et
              </Button>
            )}
          </li>
        ))}
      </ul>
      {appointmentsQuery.data?.length === 0 && <EmptyState title="Henüz randevunuz yok" />}
    </div>
  );
}
