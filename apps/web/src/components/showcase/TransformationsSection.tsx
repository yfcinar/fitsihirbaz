"use client";

import { trpc } from "@/lib/trpc";
import { resolveMediaUrl } from "@/lib/media";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const GOAL_LABELS: Record<string, string> = {
  WEIGHT_LOSS: "Kilo verme",
  WEIGHT_GAIN: "Kilo alma",
  MAINTENANCE: "Kilo koruma",
  MUSCLE_GAIN: "Kas kazanma",
  MEDICAL: "Klinik beslenme",
};

// Diyetisyen profilinde, yalnızca danışanların açık izin verdiği (varsayılan anonim) değişimler gösterilir.
export function TransformationsSection({ dietitianId }: { dietitianId: string }) {
  const query = trpc.showcase.listForDietitian.useQuery({ dietitianId });
  const items = query.data ?? [];
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <h2 className="mb-1 text-lg font-semibold text-foreground">Danışan Değişimleri</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Bu bilgiler yalnızca danışanların açık izniyle paylaşılır ve diledikleri zaman geri çekebilirler. Sonuçlar kişiye
        göre değişir; bir vaat değildir.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item, index) => (
          <Card key={`${item.displayName}-${index}`} className="p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-medium text-foreground">{item.displayName}</p>
              {item.goal && <Badge variant="secondary">{GOAL_LABELS[item.goal]}</Badge>}
            </div>
            <p className="text-2xl font-semibold text-foreground">
              {item.changeKg > 0 ? "+" : ""}
              {item.changeKg} kg
              <span className="ml-2 text-sm font-normal text-muted-foreground">(%{item.changePercent})</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.startWeightKg} kg → {item.currentWeightKg} kg · {item.durationDays} günde
            </p>
            {item.beforePhotoUrl && item.afterPhotoUrl && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <figure>
                  <img
                    src={resolveMediaUrl(item.beforePhotoUrl) ?? undefined}
                    alt="Önce"
                    className="h-40 w-full rounded object-cover"
                  />
                  <figcaption className="mt-1 text-center text-xs text-muted-foreground">Önce</figcaption>
                </figure>
                <figure>
                  <img
                    src={resolveMediaUrl(item.afterPhotoUrl) ?? undefined}
                    alt="Sonra"
                    className="h-40 w-full rounded object-cover"
                  />
                  <figcaption className="mt-1 text-center text-xs text-muted-foreground">Sonra</figcaption>
                </figure>
              </div>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}
