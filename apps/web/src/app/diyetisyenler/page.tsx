"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/lib/auth-store";
import { QueryErrorNotice } from "@/components/QueryErrorNotice";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 20;

export default function DiyetisyenlerPage() {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const searchQuery = trpc.dietitians.search.useQuery({ query: query || undefined, limit });
  const role = useAuthStore((state) => state.user?.role);
  const recommendedQuery = trpc.dietitians.recommended.useQuery({ limit: 6 }, { enabled: role === "CLIENT" });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Diyetisyenler</h1>

      <Input
        type="text"
        placeholder="İsim veya uzmanlık ara..."
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setLimit(PAGE_SIZE);
        }}
        className="mb-6 max-w-md"
      />

      {role === "CLIENT" && !query && recommendedQuery.data && recommendedQuery.data.items.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-1 text-lg font-semibold text-foreground">Sizin için önerilenler</h2>
          {recommendedQuery.data.personalized ? (
            <p className="mb-4 text-sm text-muted-foreground">
              Hedefiniz, şehriniz, görüşme tercihiniz ve bütçenize göre sıralandı. Sıralama yalnızca uygunluk ve
              kaliteye dayanır; reklam veya komisyon sıralamayı etkilemez.
            </p>
          ) : (
            <p className="mb-4 text-sm text-muted-foreground">
              Size daha iyi öneriler sunabilmemiz için{" "}
              <Link href="/danisan/profil" className="font-medium text-primary hover:underline">
                profilinizi tamamlayın
              </Link>
              . Şimdilik genel kaliteye göre sıralandı.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {recommendedQuery.data.items.map((dietitian) => (
              <Link key={dietitian.id} href={`/diyetisyenler/${dietitian.id}`}>
                <Card className="h-full p-4 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">
                        {dietitian.firstName} {dietitian.lastName}
                      </p>
                      {dietitian.title && <p className="text-sm text-muted-foreground">{dietitian.title}</p>}
                    </div>
                    {recommendedQuery.data.personalized && <Badge variant="success">%{dietitian.score} uyum</Badge>}
                  </div>
                  {dietitian.reasons.length > 0 && recommendedQuery.data.personalized && (
                    <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-foreground/80">
                      {dietitian.reasons.slice(0, 3).map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {dietitian.averageRating !== null && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                        {dietitian.averageRating.toFixed(1)} ({dietitian.reviewCount})
                      </span>
                    )}
                    {dietitian.city && <span>{dietitian.city}</span>}
                    {dietitian.sessionModes.includes("ONLINE") && <Badge variant="outline">Online</Badge>}
                    {dietitian.sessionModes.includes("IN_PERSON") && <Badge variant="outline">Yüz yüze</Badge>}
                    {dietitian.startingPrice !== null && <span>{dietitian.startingPrice} TRY'den</span>}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
          <h2 className="mb-3 mt-10 text-lg font-semibold text-foreground">Tüm diyetisyenler</h2>
        </section>
      )}

      {searchQuery.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      )}
      {searchQuery.isError && (
        <QueryErrorNotice message={searchQuery.error.message} onRetry={() => searchQuery.refetch()} />
      )}
      {searchQuery.data && searchQuery.data.items.length === 0 && (
        <EmptyState icon={Users} title="Sonuç bulunamadı" description="Farklı bir isim veya uzmanlık deneyin." />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {searchQuery.data?.items.map((dietitian) => (
          <Link key={dietitian.id} href={`/diyetisyenler/${dietitian.id}`}>
            <Card className="p-4 transition-shadow hover:shadow-md">
              <div className="flex items-center gap-2 font-medium text-foreground">
                {dietitian.firstName} {dietitian.lastName}
                {dietitian.verificationStatus === "VERIFIED" && <Badge variant="success">Onaylı</Badge>}
              </div>
              {dietitian.title && <p className="text-sm text-muted-foreground">{dietitian.title}</p>}
              {dietitian.specialties.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground/80">{dietitian.specialties.join(", ")}</p>
              )}
              {dietitian.averageRating !== null && (
                <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  {dietitian.averageRating.toFixed(1)}
                </p>
              )}
            </Card>
          </Link>
        ))}
      </div>

      {searchQuery.data && searchQuery.data.items.length < searchQuery.data.total && (
        <Button variant="outline" className="mt-6" onClick={() => setLimit((current) => current + PAGE_SIZE)}>
          Daha Fazla Yükle
        </Button>
      )}
    </div>
  );
}
