"use client";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

// Danışanın, değişimini hangi diyetisyenin herkese açık vitrininde göstereceğini yönettiği kart.
// Varsayılanlar en gizli ayarlardır (anonim, fotoğrafsız); her izin istenildiği an geri çekilebilir.
export function ShowcaseConsentCard() {
  const utils = trpc.useUtils();
  const query = trpc.showcase.myConsents.useQuery();
  const mutation = trpc.showcase.setConsent.useMutation({
    onSuccess: (data) => utils.showcase.myConsents.setData(undefined, data),
  });

  const consents = query.data ?? [];
  if (consents.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6 p-4">
      <h2 className="mb-1 text-sm font-semibold text-foreground">Değişiminizi paylaşın (isteğe bağlı)</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Diyetisyeninizin profilinde, başkalarına ilham olması için kilo değişiminizi gösterebilirsiniz. Varsayılan olarak
        adınız ve fotoğraflarınız gizlidir. Bu izin yalnızca ilgili diyetisyen için geçerlidir ve istediğiniz zaman
        kapatabilirsiniz; kapattığınız anda vitrinden kalkar.
      </p>
      <ul className="space-y-4">
        {consents.map((consent) => (
          <li key={consent.dietitianId} className="rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{consent.dietitianName}</p>
              <Button
                size="sm"
                variant={consent.active ? "outline" : "default"}
                disabled={mutation.isLoading || (!consent.active && !consent.eligible)}
                onClick={() =>
                  mutation.mutate({
                    dietitianId: consent.dietitianId,
                    active: !consent.active,
                    anonymous: consent.anonymous,
                    includePhotos: consent.includePhotos,
                  })
                }
              >
                {consent.active ? "Paylaşımı kapat" : "Paylaşmaya izin ver"}
              </Button>
            </div>
            {!consent.eligible && !consent.active && (
              <p className="mt-2 text-xs text-muted-foreground">
                Paylaşabilmek için en az iki kilo ölçümü girmelisiniz (şu an {consent.weightLogCount}).
              </p>
            )}
            {consent.active && (
              <div className="mt-3 space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={consent.anonymous}
                    onCheckedChange={(checked) =>
                      mutation.mutate({
                        dietitianId: consent.dietitianId,
                        active: true,
                        anonymous: checked === true,
                        includePhotos: consent.includePhotos,
                      })
                    }
                  />
                  Adım gizli kalsın (anonim)
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={consent.includePhotos}
                    onCheckedChange={(checked) =>
                      mutation.mutate({
                        dietitianId: consent.dietitianId,
                        active: true,
                        anonymous: consent.anonymous,
                        includePhotos: checked === true,
                      })
                    }
                  />
                  İlk ve son fotoğrafımı da göster (önce/sonra)
                </label>
              </div>
            )}
          </li>
        ))}
      </ul>
      {mutation.error && <p className="mt-2 text-sm text-destructive">{mutation.error.message}</p>}
    </Card>
  );
}
