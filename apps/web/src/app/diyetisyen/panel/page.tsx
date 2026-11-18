"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";

export default function DiyetisyenPanelPage() {
  const clientsQuery = trpc.dietitians.getMyClients.useQuery();
  const appointmentsQuery = trpc.appointments.listForDietitian.useQuery();
  const ordersQuery = trpc.orders.listForDietitian.useQuery();

  const clientCount = clientsQuery.data?.length ?? 0;
  const pendingAppointments = (appointmentsQuery.data ?? []).filter((a) => a.status === "SCHEDULED");
  const recentOrders = ordersQuery.data ?? [];
  const totalEarnings = recentOrders
    .filter((order) => order.status === "PAID")
    .reduce((sum, order) => sum + order.dietitianPayoutAmount, 0);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Panelim</h1>

      <Card className="mb-6 border-primary/20 bg-accent p-4">
        <p className="text-sm font-semibold text-foreground">Diyet yazmak için</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Bir danışan seçin, <span className="font-medium text-foreground">Plan Oluştur</span> deyin. Günleri, öğünleri ve
          besinleri ekleyip <span className="font-medium text-foreground">Danışana Gönder</span> ile yayınlayın; danışan
          “Diyetlerim” sayfasında görür.
        </p>
        {clientsQuery.data && clientsQuery.data.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">Henüz danışanınız yok. Paket satın alan danışanlar burada listelenir.</p>
        )}
        {clientsQuery.data && clientsQuery.data.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {clientsQuery.data.slice(0, 6).map((client) => (
              <li key={client.id}>
                <Link
                  href={`/diyetisyen/danisanlar/${client.id}/plan-olustur`}
                  className="inline-block rounded-md border bg-background px-3 py-1.5 text-sm font-medium text-primary hover:bg-muted"
                >
                  {client.firstName} {client.lastName} için diyet yaz →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Danışan Sayısı</p>
          {clientsQuery.isLoading && <p className="mt-2 text-sm text-muted-foreground">Yükleniyor...</p>}
          {clientsQuery.isError && <p className="mt-2 text-sm text-destructive">Yüklenemedi</p>}
          {!clientsQuery.isLoading && !clientsQuery.isError && (
            <p className="mt-2 text-2xl font-semibold text-foreground">{clientCount}</p>
          )}
          <Link href="/diyetisyen/danisanlar" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
            Danışanlarım →
          </Link>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Bekleyen Randevular</p>
          {appointmentsQuery.isLoading && <p className="mt-2 text-sm text-muted-foreground">Yükleniyor...</p>}
          {appointmentsQuery.isError && <p className="mt-2 text-sm text-destructive">Yüklenemedi</p>}
          {!appointmentsQuery.isLoading && !appointmentsQuery.isError && (
            <p className="mt-2 text-2xl font-semibold text-foreground">{pendingAppointments.length}</p>
          )}
          <Link href="/diyetisyen/randevular" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
            Randevularım →
          </Link>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Toplam Kazanç</p>
          {ordersQuery.isLoading && <p className="mt-2 text-sm text-muted-foreground">Yükleniyor...</p>}
          {ordersQuery.isError && <p className="mt-2 text-sm text-destructive">Yüklenemedi</p>}
          {!ordersQuery.isLoading && !ordersQuery.isError && (
            <p className="mt-2 text-2xl font-semibold text-foreground">{totalEarnings.toFixed(2)} TRY</p>
          )}
          <Link href="/diyetisyen/siparisler" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
            Siparişlerim →
          </Link>
        </Card>
      </div>

      {recentOrders.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Son Siparişler</h2>
          <ul className="divide-y rounded-md border">
            {recentOrders.slice(0, 5).map((order) => (
              <li key={order.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>
                  <span className="font-medium text-foreground">{order.packageTitle}</span>{" "}
                  <span className="text-muted-foreground">
                    · {order.counterpartFirstName} {order.counterpartLastName}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  {order.dietitianPayoutAmount} {order.currency}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pendingAppointments.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Yaklaşan Randevular</h2>
          <ul className="divide-y rounded-md border">
            {pendingAppointments.slice(0, 5).map((appointment) => (
              <li key={appointment.id} className="px-4 py-3 text-sm">
                <span className="font-medium text-foreground">
                  {appointment.counterpartFirstName} {appointment.counterpartLastName}
                </span>{" "}
                <span className="text-muted-foreground">{new Date(appointment.scheduledAt).toLocaleString("tr-TR")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
