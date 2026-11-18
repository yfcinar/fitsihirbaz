"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { EmptyState } from "@/components/EmptyState";
import { QueryErrorNotice } from "@/components/QueryErrorNotice";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { TrackingDayView } from "./TrackingDayView";
import { localDateString, shiftDateString } from "./tracking-ui";

const RANGE_DAYS = 14;

// Diyetisyenin danışan detay sayfasındaki "Takip" bölümü: son 14 günün özeti + seçilen günün detayı.
export function ClientTrackingPanel({ clientId }: { clientId: string }) {
  const today = localDateString();
  const from = shiftDateString(today, -(RANGE_DAYS - 1));
  const [selectedDate, setSelectedDate] = useState(today);

  const rangeQuery = trpc.tracking.getRange.useQuery({ clientId, from, to: today });
  const dayQuery = trpc.tracking.getDay.useQuery({ clientId, date: selectedDate });

  if (rangeQuery.isError) {
    return <QueryErrorNotice message={rangeQuery.error.message} onRetry={() => rangeQuery.refetch()} />;
  }

  const rows = [...(rangeQuery.data ?? [])].reverse();
  const hasAnyData = rows.some(
    (row) => row.adherence.plannedCount > 0 || row.waterTotalMl > 0 || row.extraFoodCount > 0,
  );

  return (
    <div className="mb-6">
      <h2 className="mb-2 text-lg font-medium text-foreground">Günlük Takip</h2>
      {rangeQuery.isLoading && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}
      {rangeQuery.data && !hasAnyData && (
        <EmptyState
          title="Henüz takip verisi yok"
          description="Danışan aktif bir plandaki öğünleri işaretlediğinde, su veya besin eklediğinde burada görünür."
        />
      )}

      {hasAnyData && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarih</TableHead>
              <TableHead>Plana uyum</TableHead>
              <TableHead>Kalori</TableHead>
              <TableHead>Su</TableHead>
              <TableHead>Plan dışı</TableHead>
              <TableHead>Yorum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.date}
                onClick={() => setSelectedDate(row.date)}
                className={cn("cursor-pointer", row.date === selectedDate && "bg-muted")}
                aria-selected={row.date === selectedDate}
              >
                <TableCell>{row.date}</TableCell>
                <TableCell>
                  {row.adherence.adherencePercent === null ? (
                    <span className="text-muted-foreground">Planlı öğün yok</span>
                  ) : (
                    <Badge
                      variant={
                        row.adherence.adherencePercent >= 80
                          ? "success"
                          : row.adherence.adherencePercent >= 50
                            ? "warning"
                            : "destructive"
                      }
                    >
                      %{row.adherence.adherencePercent} ({row.adherence.eatenCount}/{row.adherence.plannedCount})
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{row.consumedCalories} kcal</TableCell>
                <TableCell>{(row.waterTotalMl / 1000).toFixed(2)} L</TableCell>
                <TableCell>{row.extraFoodCount}</TableCell>
                <TableCell>{row.commentCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="mt-4">
        {dayQuery.isError && <QueryErrorNotice message={dayQuery.error.message} onRetry={() => dayQuery.refetch()} />}
        {dayQuery.data && <TrackingDayView clientId={clientId} day={dayQuery.data} />}
      </div>
    </div>
  );
}
