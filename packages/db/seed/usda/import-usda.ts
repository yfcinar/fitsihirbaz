import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { parseCsv, readTable, selectFoods } from "./usda-select";
import { translateDescription, translationCoverage } from "./usda-translate";

// USDA FoodData Central "SR Legacy" (CSV) -> FoodItem + NutrientData içe aktarma.
//
// Kullanım:
//   1) https://fdc.nal.usda.gov/download-datasets adresinden "SR Legacy" CSV zip'ini indirip açın
//      (FoodData_Central_sr_legacy_food_csv_2018-04.zip, ~6,7 MB). Veri kamu malıdır (CC0).
//   2) USDA_DIR=<açılan klasör> pnpm db:import-usda        (veya: pnpm db:import-usda <klasör>)
//      Veritabanına yazmadan önizleme için: --dry-run
//
// Betik idempotenttir: her gıdanın kimliği FDC numarasından türetilir, tekrar çalıştırmak
// kayıtları günceller, çoğaltmaz. Elle eklenmiş/onaylanmış (USDA dışı) besinlere dokunulmaz.

const USDA_SOURCE_ID = "00000000-0000-0000-0000-000000000002";

const CATEGORY_TR: Record<string, string> = {
  "Dairy and Egg Products": "Süt Ürünleri",
  "Spices and Herbs": "Baharat ve Otlar",
  "Fats and Oils": "Yağlar",
  "Poultry Products": "Et ve Tavuk Ürünleri",
  "Soups, Sauces, and Gravies": "Çorba ve Soslar",
  "Sausages and Luncheon Meats": "Et ve Tavuk Ürünleri",
  "Breakfast Cereals": "Tahıllar",
  "Fruits and Fruit Juices": "Meyveler",
  "Pork Products": "Et ve Tavuk Ürünleri",
  "Vegetables and Vegetable Products": "Sebzeler",
  "Nut and Seed Products": "Kuruyemişler",
  "Beef Products": "Et ve Tavuk Ürünleri",
  "Beverages": "İçecekler",
  "Finfish and Shellfish Products": "Balık ve Deniz Ürünleri",
  "Legumes and Legume Products": "Baklagiller",
  "Lamb, Veal, and Game Products": "Et ve Tavuk Ürünleri",
  "Baked Products": "Fırın Ürünleri",
  "Sweets": "Tatlılar ve Atıştırmalıklar",
  "Cereal Grains and Pasta": "Tahıllar",
  "Meals, Entrees, and Side Dishes": "Hazır Yemekler",
  "Snacks": "Tatlılar ve Atıştırmalıklar",
  "Alcoholic Beverages": "İçecekler",
};

// USDA besin kodu -> amaç (100 g başına).
const N = {
  protein: "1003",
  fat: "1004",
  carbs: "1005",
  energy: "1008",
  energyAtwaterGeneral: "2047",
  energyAtwaterSpecific: "2048",
  fiber: "1079",
  sugar: "2000",
};
const MINERALS: Record<string, string> = {
  "1087": "Kalsiyum (mg)",
  "1089": "Demir (mg)",
  "1090": "Magnezyum (mg)",
  "1092": "Potasyum (mg)",
  "1093": "Sodyum (mg)",
  "1095": "Çinko (mg)",
};
const VITAMINS: Record<string, string> = {
  "1106": "A Vitamini (µg RAE)",
  "1162": "C Vitamini (mg)",
  "1114": "D Vitamini (µg)",
  "1109": "E Vitamini (mg)",
  "1185": "K Vitamini (µg)",
  "1175": "B6 Vitamini (mg)",
  "1177": "Folat (µg)",
  "1178": "B12 Vitamini (µg)",
};
const WANTED = new Set([...Object.values(N), ...Object.keys(MINERALS), ...Object.keys(VITAMINS)]);

const UNIT_TR: Record<string, string> = {
  cup: "bardak", tablespoon: "yemek kaşığı", teaspoon: "çay kaşığı", "fl oz": "sıvı oz", oz: "oz", slice: "dilim",
  serving: "porsiyon", piece: "parça", pat: "parça", "undetermined": "",
};

function foodId(fdcId: number): string {
  // Deterministik UUID (sha1 tabanlı, v5 biçiminde): aynı FDC numarası her zaman aynı kimliği üretir.
  const hex = createHash("sha1").update(`usda-sr-legacy-${fdcId}`).digest("hex");
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

interface Portion {
  description: string;
  gramWeight: number;
}

function buildPortions(dir: string, ids: Set<string>): Map<string, Portion> {
  const units = new Map(readTable(dir, "measure_unit.csv").map((row) => [row.id, row.name]));
  const rows = readTable(dir, "food_portion.csv")
    .filter((row) => ids.has(row.fdc_id) && Number(row.gram_weight) > 0)
    .sort((a, b) => Number(a.seq_num) - Number(b.seq_num));
  const result = new Map<string, Portion>();
  for (const row of rows) {
    if (result.has(row.fdc_id)) continue;
    const unit = units.get(row.measure_unit_id) ?? "";
    const unitTr = unit in UNIT_TR ? UNIT_TR[unit] : unit;
    const modifier = row.modifier ? translateDescription(row.modifier) : "";
    const amount = Number(row.amount) || 1;
    const label = [String(amount), unitTr, modifier].filter(Boolean).join(" ");
    result.set(row.fdc_id, { description: label, gramWeight: Number(row.gram_weight) });
  }
  return result;
}

function loadNutrients(dir: string, ids: Set<string>): Map<string, Map<string, number>> {
  const [header, ...rows] = parseCsv(
    // food_nutrient.csv ~40 MB: tamamı belleğe okunur, sadece gerekli satırlar tutulur.
    require("node:fs").readFileSync(`${dir}/food_nutrient.csv`, "utf8"),
  );
  const idx = { fdc: header.indexOf("fdc_id"), nutrient: header.indexOf("nutrient_id"), amount: header.indexOf("amount") };
  const result = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const fdcId = row[idx.fdc];
    const nutrientId = row[idx.nutrient];
    if (!ids.has(fdcId) || !WANTED.has(nutrientId)) continue;
    const amount = Number(row[idx.amount]);
    if (!Number.isFinite(amount)) continue;
    const map = result.get(fdcId) ?? new Map<string, number>();
    map.set(nutrientId, amount);
    result.set(fdcId, map);
  }
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const dir = args.find((arg) => !arg.startsWith("--")) ?? process.env.USDA_DIR;
  if (!dir) {
    throw new Error("USDA klasörü verilmedi: USDA_DIR=<klasör> pnpm db:import-usda  (bkz. dosya başındaki açıklama)");
  }

  const selected = selectFoods(dir);
  const ids = new Set(selected.map((food) => String(food.fdcId)));
  const nutrients = loadNutrients(dir, ids);
  const portions = buildPortions(dir, ids);

  const items = selected.flatMap((food) => {
    const values = nutrients.get(String(food.fdcId));
    if (!values) return [];
    const protein = values.get(N.protein) ?? 0;
    const fat = values.get(N.fat) ?? 0;
    const carbs = values.get(N.carbs) ?? 0;
    const calories =
      values.get(N.energy) ??
      values.get(N.energyAtwaterGeneral) ??
      values.get(N.energyAtwaterSpecific) ??
      // Hiç enerji değeri yoksa makrolardan Atwater (4/4/9) ile hesaplanır.
      round(protein * 4 + carbs * 4 + fat * 9, 0);

    const pick = (table: Record<string, string>) => {
      const out: Record<string, number> = {};
      for (const [code, label] of Object.entries(table)) {
        const value = values.get(code);
        if (value !== undefined) out[label] = round(value);
      }
      return Object.keys(out).length > 0 ? out : undefined;
    };

    const portion = portions.get(String(food.fdcId));
    const name = translateDescription(food.description);
    const category = /^egg\b/i.test(food.description) ? "Yumurta" : (CATEGORY_TR[food.category] ?? "Diğer");
    return [
      {
        id: foodId(food.fdcId),
        name,
        nameEn: food.description,
        category,
        coverage: translationCoverage(food.description),
        servingDescription: portion?.description ?? null,
        servingGramWeight: portion?.gramWeight ?? null,
        nutrients: {
          calories: round(calories),
          protein: round(protein),
          carbs: round(carbs),
          fat: round(fat),
          fiber: values.has(N.fiber) ? round(values.get(N.fiber) as number) : null,
          sugar: values.has(N.sugar) ? round(values.get(N.sugar) as number) : null,
          minerals: pick(MINERALS),
          vitamins: pick(VITAMINS),
        },
      },
    ];
  });

  const lowCoverage = items.filter((item) => item.coverage < 0.5).length;
  console.log(`Seçilen: ${selected.length}, besin değeri olan: ${items.length}`);
  console.log(
    `Ortalama çeviri kapsamı: %${Math.round((items.reduce((s, i) => s + i.coverage, 0) / items.length) * 100)}, ` +
      `kapsamı %50'nin altında olan: ${lowCoverage}`,
  );

  if (dryRun) {
    const step = Math.max(1, Math.floor(items.length / 25));
    for (let i = 0; i < items.length; i += step) {
      console.log(`- [${items[i].category}] ${items[i].name}  <=  ${items[i].nameEn}`);
    }
    return;
  }

  const prisma = new PrismaClient();
  try {
    await prisma.foodSource.upsert({
      where: { id: USDA_SOURCE_ID },
      update: {},
      create: {
        id: USDA_SOURCE_ID,
        name: "USDA FoodData Central — SR Legacy (2018)",
        citation:
          "U.S. Department of Agriculture, Agricultural Research Service. USDA National Nutrient Database for Standard Reference, Legacy Release (April 2018). FoodData Central, fdc.nal.usda.gov. Public domain (CC0 1.0). Türkçe isimler otomatik çevrilmiştir; özgün İngilizce tanım 'nameEn' alanındadır.",
        url: "https://fdc.nal.usda.gov",
      },
    });

    const BATCH = 100;
    for (let start = 0; start < items.length; start += BATCH) {
      const batch = items.slice(start, start + BATCH);
      await prisma.$transaction(
        batch.flatMap((item) => [
          prisma.foodItem.upsert({
            where: { id: item.id },
            create: {
              id: item.id,
              name: item.name,
              nameEn: item.nameEn,
              category: item.category,
              servingDescription: item.servingDescription,
              servingGramWeight: item.servingGramWeight,
              sourceId: USDA_SOURCE_ID,
              isVerified: true,
            },
            update: {
              name: item.name,
              nameEn: item.nameEn,
              category: item.category,
              servingDescription: item.servingDescription,
              servingGramWeight: item.servingGramWeight,
            },
          }),
          prisma.nutrientData.upsert({
            where: { foodItemId: item.id },
            create: { foodItemId: item.id, ...item.nutrients },
            update: item.nutrients,
          }),
        ]),
      );
      process.stdout.write(`\r${Math.min(start + BATCH, items.length)}/${items.length}`);
    }
    console.log("\nUSDA içe aktarma tamamlandı.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
