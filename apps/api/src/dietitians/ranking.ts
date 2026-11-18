import type { Goal, SessionMode } from "@fit-sihirbaz/shared";

// Danışana diyetisyen önerisi için şeffaf, açıklanabilir puanlama.
//
// İLKELER
// - Puan yalnızca danışana uygunluğu ve diyetisyenin kalitesini yansıtır. Komisyon oranı,
//   ödeme veya reklam ağırlığı KULLANILMAZ (commissionRate bu modüle hiç girmez).
// - Her öneri, puanı oluşturan gerekçelerle (reasons) birlikte döner; kullanıcı "neden bu kişi?"
//   sorusunun cevabını görebilir.
// - Eksik veri puanı cezalandırmaz: bilinmeyen bir alan nötr (0.5) sayılır.

export interface RankingClient {
  goal: Goal | null;
  city: string | null;
  preferredSessionMode: SessionMode | null;
  maxBudgetTry: number | null;
  medicalNotes: string | null;
  sports: string[];
  dietaryPreferences: string[];
  allergies: string[];
}

export interface RankingDietitian {
  id: string;
  title: string | null;
  bio: string | null;
  specialties: string[];
  city: string | null;
  averageRating: number | null;
  reviewCount: number;
  yearsOfExperience: number | null;
  packages: Array<{ price: number; sessionMode: SessionMode }>;
}

export interface ScoreBreakdown {
  expertise: number;
  access: number;
  budget: number;
  quality: number;
  experience: number;
}

export interface ScoredDietitian {
  dietitianId: string;
  score: number; // 0-100
  breakdown: ScoreBreakdown;
  reasons: string[];
  startingPrice: number | null;
  sessionModes: Array<"ONLINE" | "IN_PERSON">;
}

export const WEIGHTS: ScoreBreakdown = { expertise: 0.35, access: 0.2, budget: 0.15, quality: 0.2, experience: 0.1 };

// Az sayıda yorumu olan birinin 5.0'ı, çok yorumu olan birinin 4.8'ini geçmesin diye Bayes ortalaması:
// yorum sayısı arttıkça gerçek ortalamaya yaklaşır.
const PRIOR_RATING = 4.0;
const PRIOR_WEIGHT = 5;

export function normalize(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u")
    .replace(/\s+/g, " ")
    .trim();
}

interface KeywordGroup {
  label: string;
  weight: number;
  keywords: string[];
}

const GOAL_GROUPS: Record<Goal, KeywordGroup> = {
  WEIGHT_LOSS: { label: "kilo verme", weight: 2, keywords: ["kilo", "obezite", "zayiflama", "yag yakim", "davranis"] },
  WEIGHT_GAIN: { label: "kilo alma", weight: 2, keywords: ["kilo al", "sporcu", "kas", "gelisim"] },
  MAINTENANCE: { label: "kilo koruma", weight: 2, keywords: ["surdurulebilir", "saglikli beslenme", "yasam tarzi", "kilo"] },
  MUSCLE_GAIN: { label: "kas kazanma", weight: 2, keywords: ["spor", "sporcu", "kas", "performans"] },
  MEDICAL: { label: "klinik beslenme", weight: 2, keywords: ["klinik", "hastalik", "tibbi", "diyabet", "metabolik"] },
};

const CONDITION_GROUPS: Array<{ patterns: string[]; group: KeywordGroup }> = [
  { patterns: ["diyabet", "seker hastaligi", "insulin direnc"], group: { label: "diyabet", weight: 1, keywords: ["diyabet", "insulin", "endokrin"] } },
  { patterns: ["tansiyon", "kolesterol", "kalp", "trigliserit"], group: { label: "kalp-damar sağlığı", weight: 1, keywords: ["kalp", "kardiyo", "kolesterol", "klinik"] } },
  { patterns: ["tiroid", "tiroit", "hashimoto"], group: { label: "tiroid", weight: 1, keywords: ["tiroid", "endokrin", "klinik"] } },
  { patterns: ["pcos", "polikistik"], group: { label: "PCOS", weight: 1, keywords: ["pcos", "endokrin", "kadin", "insulin"] } },
  { patterns: ["hamile", "gebe", "emzir"], group: { label: "gebelik/emzirme", weight: 1, keywords: ["gebelik", "hamile", "anne", "kadin"] } },
  { patterns: ["colyak", "gluten"], group: { label: "çölyak", weight: 1, keywords: ["colyak", "alerji", "intolerans"] } },
  { patterns: ["ibs", "reflu", "gastrit", "mide", "bagirsak", "kabizlik"], group: { label: "sindirim sağlığı", weight: 1, keywords: ["sindirim", "gastro", "bagirsak"] } },
];

const SPORTS_GROUP: KeywordGroup = { label: "spor beslenmesi", weight: 1, keywords: ["spor", "sporcu", "performans"] };
const PLANT_GROUP: KeywordGroup = { label: "bitkisel beslenme", weight: 1, keywords: ["vegan", "vejetaryen", "bitki"] };
const ALLERGY_GROUP: KeywordGroup = { label: "alerji/intolerans", weight: 1, keywords: ["alerji", "intolerans", "colyak"] };

function clientGroups(client: RankingClient): KeywordGroup[] {
  const groups: KeywordGroup[] = [];
  if (client.goal) groups.push(GOAL_GROUPS[client.goal]);
  const medical = normalize(client.medicalNotes ?? "");
  if (medical) {
    for (const { patterns, group } of CONDITION_GROUPS) {
      if (patterns.some((pattern) => medical.includes(pattern))) groups.push(group);
    }
  }
  if (client.sports.length > 0) groups.push(SPORTS_GROUP);
  if (client.dietaryPreferences.some((pref) => /vegan|vejetaryen|bitki/.test(normalize(pref)))) groups.push(PLANT_GROUP);
  if (client.allergies.length > 0) groups.push(ALLERGY_GROUP);
  return groups;
}

function expertiseScore(client: RankingClient, dietitian: RankingDietitian): { score: number; matched: string[] } {
  const groups = clientGroups(client);
  if (groups.length === 0) return { score: 0.5, matched: [] };
  const haystack = normalize([...dietitian.specialties, dietitian.title ?? "", dietitian.bio ?? ""].join(" "));
  const matched = groups.filter((group) => group.keywords.some((keyword) => haystack.includes(keyword)));
  const total = groups.reduce((sum, group) => sum + group.weight, 0);
  const got = matched.reduce((sum, group) => sum + group.weight, 0);
  return { score: got / total, matched: matched.map((group) => group.label) };
}

function offersMode(dietitian: RankingDietitian, mode: "ONLINE" | "IN_PERSON"): boolean {
  return dietitian.packages.some((pkg) => pkg.sessionMode === "BOTH" || pkg.sessionMode === mode);
}

function sameCity(a: string | null, b: string | null): boolean {
  return !!a && !!b && normalize(a) === normalize(b);
}

function accessScore(client: RankingClient, dietitian: RankingDietitian): number {
  const online = offersMode(dietitian, "ONLINE");
  const inPerson = offersMode(dietitian, "IN_PERSON");
  const city = sameCity(client.city, dietitian.city);

  if (client.preferredSessionMode === "ONLINE") return online ? 1 : 0.1;
  if (client.preferredSessionMode === "IN_PERSON") {
    if (!inPerson) return 0;
    if (!client.city || !dietitian.city) return 0.3; // şehir bilinmiyorsa yargılanamaz
    return city ? 1 : 0.1;
  }
  // Tercih belirtilmemiş: erişilebilir olması ve aynı şehirde olması iyi.
  const reachable = online || (inPerson && city);
  return Math.min(1, (reachable ? 0.7 : dietitian.packages.length > 0 ? 0.3 : 0.1) + (city ? 0.3 : 0));
}

function compatiblePrices(client: RankingClient, dietitian: RankingDietitian): number[] {
  return dietitian.packages
    .filter((pkg) => {
      const mode = client.preferredSessionMode;
      return !mode || pkg.sessionMode === "BOTH" || pkg.sessionMode === mode;
    })
    .map((pkg) => pkg.price);
}

function budgetScore(client: RankingClient, dietitian: RankingDietitian): { score: number; cheapest: number | null } {
  const prices = compatiblePrices(client, dietitian);
  const cheapest = prices.length > 0 ? Math.min(...prices) : null;
  if (client.maxBudgetTry === null) return { score: 0.5, cheapest };
  if (cheapest === null) return { score: 0, cheapest };
  if (cheapest <= client.maxBudgetTry) return { score: 1, cheapest };
  if (cheapest <= client.maxBudgetTry * 1.2) return { score: 0.4, cheapest };
  return { score: 0, cheapest };
}

export function qualityScore(averageRating: number | null, reviewCount: number): number {
  const rating = averageRating === null || reviewCount === 0 ? null : averageRating;
  const bayes =
    rating === null ? PRIOR_RATING : (PRIOR_WEIGHT * PRIOR_RATING + rating * reviewCount) / (PRIOR_WEIGHT + reviewCount);
  return Math.min(1, Math.max(0, (bayes - 3) / 2));
}

function experienceScore(years: number | null): number {
  return years === null ? 0.3 : Math.min(years, 15) / 15;
}

export function scoreDietitian(client: RankingClient, dietitian: RankingDietitian): ScoredDietitian {
  const expertise = expertiseScore(client, dietitian);
  const access = accessScore(client, dietitian);
  const budget = budgetScore(client, dietitian);
  const quality = qualityScore(dietitian.averageRating, dietitian.reviewCount);
  const experience = experienceScore(dietitian.yearsOfExperience);

  const breakdown: ScoreBreakdown = {
    expertise: expertise.score,
    access,
    budget: budget.score,
    quality,
    experience,
  };
  const total =
    breakdown.expertise * WEIGHTS.expertise +
    breakdown.access * WEIGHTS.access +
    breakdown.budget * WEIGHTS.budget +
    breakdown.quality * WEIGHTS.quality +
    breakdown.experience * WEIGHTS.experience;

  const reasons: string[] = [];
  if (expertise.matched.length > 0) reasons.push(`Uzmanlığı ihtiyacınızla uyumlu: ${expertise.matched.join(", ")}`);
  const online = offersMode(dietitian, "ONLINE");
  const inPerson = offersMode(dietitian, "IN_PERSON");
  const city = sameCity(client.city, dietitian.city);
  if (client.preferredSessionMode === "IN_PERSON" && inPerson && city) {
    reasons.push(`${dietitian.city} şehrinde yüz yüze görüşebilir`);
  } else if (client.preferredSessionMode === "ONLINE" && online) {
    reasons.push("Online görüşme sunuyor");
  } else if (!client.preferredSessionMode && city && inPerson) {
    reasons.push(`Şehrinizde (${dietitian.city}) yüz yüze görüşme imkânı var`);
  } else if (!client.preferredSessionMode && online) {
    reasons.push("Online görüşme sunuyor");
  }
  if (client.maxBudgetTry !== null && budget.score === 1 && budget.cheapest !== null) {
    reasons.push(`Bütçenize uygun paket (${budget.cheapest} TRY'den başlıyor)`);
  }
  if (dietitian.averageRating !== null && dietitian.reviewCount > 0 && quality >= 0.7) {
    reasons.push(`Yüksek puan: ${dietitian.averageRating.toFixed(1)} (${dietitian.reviewCount} yorum)`);
  }
  if ((dietitian.yearsOfExperience ?? 0) >= 5) reasons.push(`${dietitian.yearsOfExperience} yıllık deneyim`);

  const modes: Array<"ONLINE" | "IN_PERSON"> = [];
  if (online) modes.push("ONLINE");
  if (inPerson) modes.push("IN_PERSON");

  return {
    dietitianId: dietitian.id,
    score: Math.round(total * 100),
    breakdown,
    reasons,
    startingPrice: dietitian.packages.length > 0 ? Math.min(...dietitian.packages.map((pkg) => pkg.price)) : null,
    sessionModes: modes,
  };
}

// Puana göre azalan; eşitlikte daha yüksek kalite, sonra deterministik kimlik sırası.
export function rankDietitians(client: RankingClient, dietitians: RankingDietitian[]): ScoredDietitian[] {
  return dietitians
    .map((dietitian) => scoreDietitian(client, dietitian))
    .sort(
      (a, b) =>
        b.score - a.score || b.breakdown.quality - a.breakdown.quality || a.dietitianId.localeCompare(b.dietitianId),
    );
}
