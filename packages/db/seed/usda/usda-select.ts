import { readFileSync } from "node:fs";
import { join } from "node:path";

// USDA FoodData Central SR Legacy (CSV) okuyucu ve "temel gıda" seçici.
// Veri kamu malıdır (CC0); kaynak gösterilmesi istenir (FoodSource kaydına yazılır).

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function readTable(dir: string, file: string): Array<Record<string, string>> {
  const [header, ...rows] = parseCsv(readFileSync(join(dir, file), "utf8"));
  return rows.map((row) => Object.fromEntries(header.map((name, index) => [name, row[index] ?? ""])));
}

// USDA kategori kimliği -> seçilecek en fazla gıda sayısı. Marka ağırlıklı ve bebek/restoran
// kategorileri bilinçli olarak dışarıda bırakılmıştır.
export const CATEGORY_QUOTAS: Record<string, number> = {
  "Dairy and Egg Products": 120,
  "Spices and Herbs": 60,
  "Fats and Oils": 70,
  "Poultry Products": 110,
  "Soups, Sauces, and Gravies": 70,
  "Sausages and Luncheon Meats": 40,
  "Breakfast Cereals": 40,
  "Fruits and Fruit Juices": 260,
  "Pork Products": 100,
  "Vegetables and Vegetable Products": 460,
  "Nut and Seed Products": 120,
  "Beef Products": 150,
  "Beverages": 70,
  "Finfish and Shellfish Products": 180,
  "Legumes and Legume Products": 150,
  "Lamb, Veal, and Game Products": 90,
  "Baked Products": 80,
  "Sweets": 80,
  "Cereal Grains and Pasta": 150,
  "Meals, Entrees, and Side Dishes": 40,
  "Snacks": 40,
  "Alcoholic Beverages": 20,
};

// Marka adı içeren ürünler "temel gıda" değildir.
const BRANDS = [
  "Inc", "LLC", "USDA Commodity", "Kraft", "Campbell's", "Hormel", "Vitasoy", "Nasoya", "Archway", "Oscar Mayer", "Ralston",
  "Post", "Quaker", "Nabisco", "Reese's", "Hershey's", "Twizzlers", "Mori-Nu", "Azumaya", "Swanson", "Hain", "Clif", "Rockstar",
  "Monster", "Zevia", "Bolthouse", "General Mills", "Cheerios", "Alpen", "Weetabix", "Familia", "Uncle Ben's", "Rice-A-Roni",
  "Tinkyada", "Smucker's", "Benecol", "Mother's", "Schiff", "Kit Kat", "Mounds", "Skor", "Rolo", "Heath", "Krackel", "Caramello",
  "Nutrageous", "Whatchamacallit", "Solitaires", "Silk", "Pillsbury", "Kellogg's", "Kellogg", "Lender's", "Sara Lee", "Pepperidge",
  "Keebler", "Little Debbie", "Entenmann's", "Hostess", "Nestle", "Snickers", "M&M", "McDonald's", "Burger King", "Wendy's",
  "Taco Bell", "Pizza Hut", "KFC", "Subway", "Starbucks", "Gatorade", "Pepsi", "Coca-Cola", "Red Bull", "Ovaltine", "Slim-Fast",
  "Ensure", "Similac", "Enfamil", "Gerber", "Beech-Nut", "Heinz", "Cap'n Crunch", "Froot Loops", "Lucky Charms", "Trix", "Wheaties",
  "Special K", "Raisin Bran", "Chex", "Kix", "Nature Valley", "Pop-Tarts", "Sam's", "Tasteeos", "Alpha-Bits", "Reddi", "Pam", "Dove",
  "Andrea's", "Weight Watchers", "Atkins", "South Beach", "Morningstar", "Boca", "Gardenburger", "Lightlife", "Worthington",
];

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const BRAND_PATTERN = new RegExp(
  "[®™]|(?:^|[^A-Za-z])(?:" + BRANDS.map(escapeRegExp).join("|") + ")(?:[^A-Za-z]|$)",
);

// "(Includes foods for USDA's Food Distribution Program)" gibi açıklayıcı parantezler isimden atılır.
function cleanDescription(raw: string): string {
  return raw
    .replace(/\s*\((?:includes)[^)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface SelectedFood {
  fdcId: number;
  description: string;
  category: string;
}

// Tanım ne kadar kısa ve virgülsüzse o kadar "temel" kabul edilir ("Apples, raw, with skin" >
// "Beef, chuck, arm pot roast, separable lean and fat, trimmed to 1/8" fat, choice, cooked...").
function basicness(description: string): number {
  const commas = (description.match(/,/g) ?? []).length;
  return commas * 100 + description.length;
}

export function selectFoods(dir: string): SelectedFood[] {
  const categories = new Map(readTable(dir, "food_category.csv").map((row) => [row.id, row.description]));
  const foods = readTable(dir, "food.csv");
  const byCategory = new Map<string, SelectedFood[]>();
  const seen = new Set<string>();

  for (const row of foods) {
    const category = categories.get(row.food_category_id) ?? "";
    if (!(category in CATEGORY_QUOTAS)) continue;
    const description = cleanDescription(row.description);
    // Marka/ticari ürünler, ithal/Yeni Zelanda tekrarları ve aynı isimli kayıtlar elenir.
    if (BRAND_PATTERN.test(description) || /\b(imported|New Zealand)\b/i.test(description)) continue;
    // USDA marka adlarını BÜYÜK HARFLE yazar ("POST, GOLDEN CRISP"); 3+ harfli büyük harfli sözcük (USDA/DHA hariç) marka sayılır.
    if (/\b(?!USDA\b|DHA\b|FDA\b)[A-Z]{3,}\b/.test(description)) continue;
    const key = description.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const list = byCategory.get(category) ?? [];
    list.push({ fdcId: Number(row.fdc_id), description, category });
    byCategory.set(category, list);
  }

  const selected: SelectedFood[] = [];
  for (const [category, quota] of Object.entries(CATEGORY_QUOTAS)) {
    const list = (byCategory.get(category) ?? []).sort(
      (a, b) => basicness(a.description) - basicness(b.description) || a.fdcId - b.fdcId,
    );
    selected.push(...list.slice(0, quota));
  }
  return selected;
}
