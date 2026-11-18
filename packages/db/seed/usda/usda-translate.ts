// USDA gıda tanımlarını (ör. "Chicken, broilers or fryers, breast, meat only, cooked, roasted")
// kelime/ifade sözlüğüyle Türkçeye çevirir. Amaç mükemmel bir çeviri değil, Türkçe arama ve
// okunabilirlik için yeterli bir başlangıçtır: sözlükte olmayan kelimeler İngilizce kalır ve
// özgün İngilizce tanım her zaman FoodItem.nameEn olarak saklanır. Admin panelinden düzeltilebilir.

// Virgülle ayrılmış bir parçanın tamamı için (kelime çevirisinden önce denenir).
const PHRASES: Record<string, string> = {
  "without added salt": "tuz eklenmemiş",
  "with added salt": "tuz eklenmiş",
  "cooked with water": "suyla pişmiş",
  "with water": "suyla",
  "with sugar": "şekerli",
  "with added sugar": "şeker eklenmiş",
  "dry heat": "kuru ısıyla",
  "moist heat": "nemli ısıyla",
  "dry heat, cooked": "kuru ısıyla pişmiş",
  "all types": "tüm türler",
  "separable lean and fat": "yağlı et (ayrılabilir)", "separable lean only": "yalnızca yağsız et (ayrılabilir)", "separable fat": "ayrılabilir yağ", "meat only": "yalnızca et",
  "meat and skin": "et ve deri", "meat only with skin": "derili et", "skin only": "yalnızca deri", "without salt": "tuzsuz",
  "with salt": "tuzlu", "no salt added": "tuz eklenmemiş", "salt added": "tuz eklenmiş", "drained solids": "süzülmüş",
  "solids and liquids": "sıvısıyla birlikte", "ready-to-eat": "tüketime hazır", "ready-to-serve": "servise hazır", "ready to serve": "servise hazır",
  "all varieties": "tüm çeşitler", "all commercial varieties": "tüm ticari çeşitler", "all classes": "tüm sınıflar", "commercial": "ticari",
  "regular": "normal", "not heated": "ısıtılmamış", "pan-fried": "tavada kızartılmış", "oven-roasted": "fırında kavrulmuş",
  "dry roasted": "kuru kavrulmuş", "oil roasted": "yağda kavrulmuş", "cooked, boiled, drained, without salt": "haşlanmış, süzülmüş, tuzsuz", "cooked, boiled, drained, with salt": "haşlanmış, süzülmüş, tuzlu",
  "with skin": "kabuklu", "without skin": "kabuksuz", "with added ascorbic acid": "C vitamini eklenmiş", "from concentrate": "konsantreden",
  "not from concentrate": "konsantreden değil", "includes skin": "derili", "bone-in": "kemikli", "boneless": "kemiksiz",
  "fat free": "yağsız", "low fat": "az yağlı", "reduced fat": "azaltılmış yağlı", "whole milk": "tam yağlı süt",

};

const WORDS: Record<string, string> = {
  "raw": "çiğ", "cooked": "pişmiş", "boiled": "haşlanmış", "hard-boiled": "katı haşlanmış", "self-rising": "kabartmalı", "whole-wheat": "tam buğday", "roasted": "kavrulmuş",
  "baked": "fırında", "fried": "kızartılmış", "broiled": "ızgara", "grilled": "ızgara",
  "steamed": "buharda pişmiş", "stewed": "közlenmiş/haşlama", "braised": "kısık ateşte pişmiş", "simmered": "kaynatılmış",
  "microwaved": "mikrodalgada pişmiş", "sauteed": "sote", "pan-broiled": "tavada ızgara", "pan-browned": "tavada kızartılmış",
  "pan-fried": "tavada kızartılmış", "toasted": "kızarmış", "smoked": "füme", "cured": "salamura/tütsülenmiş",
  "pickled": "turşu", "dried": "kurutulmuş", "dry": "kuru", "dehydrated": "suyu alınmış",
  "freeze-dried": "dondurularak kurutulmuş", "sun-dried": "güneşte kurutulmuş", "frozen": "dondurulmuş", "canned": "konserve",
  "fresh": "taze", "unprepared": "hazırlanmamış", "prepared": "hazırlanmış", "uncooked": "pişmemiş",
  "unheated": "ısıtılmamış", "heated": "ısıtılmış", "drained": "süzülmüş", "sliced": "dilimlenmiş",
  "chopped": "doğranmış", "diced": "küp doğranmış", "mashed": "ezilmiş", "grated": "rendelenmiş",
  "shredded": "rendelenmiş", "ground": "öğütülmüş", "whole": "bütün", "crushed": "ezilmiş",
  "minced": "kıyılmış", "peeled": "soyulmuş", "unpeeled": "soyulmamış", "sweetened": "şekerli",
  "unsweetened": "şekersiz", "salted": "tuzlu", "unsalted": "tuzsuz", "plain": "sade",
  "flavored": "aromalı", "fortified": "zenginleştirilmiş", "enriched": "zenginleştirilmiş", "unenriched": "zenginleştirilmemiş",
  "organic": "organik", "low": "düşük", "reduced": "azaltılmış", "light": "light",
  "lite": "light", "free": "içermeyen", "nonfat": "yağsız", "lowfat": "az yağlı",
  "low-fat": "az yağlı", "fat-free": "yağsız", "full-fat": "tam yağlı", "skim": "yağsız",
  "sulfured": "kükürtlü", "mature": "olgun", "immature": "olgunlaşmamış", "ripe": "olgun",
  "firm": "sert", "soft": "yumuşak", "hard": "sert", "medium": "orta",
  "extra": "ekstra", "heavy": "yoğun", "thin": "ince", "thick": "kalın",
  "mixed": "karışık", "assorted": "karışık", "regular": "normal", "home": "ev",
  "home-prepared": "ev yapımı", "homemade": "ev yapımı", "commercial": "ticari", "imported": "ithal",
  "breaded": "galeta unlu", "battered": "hamurlu", "stuffed": "dolma", "glazed": "şekerlemeli",
  "frosted": "kremalı", "refrigerated": "soğutulmuş", "chilled": "soğutulmuş", "shelf": "raf",
  "instant": "hazır", "condensed": "yoğunlaştırılmış", "evaporated": "buharlaştırılmış", "powdered": "toz",
  "powder": "tozu", "granulated": "toz şeker", "liquid": "sıvı", "solid": "katı",
  "concentrate": "konsantre", "concentrated": "konsantre", "sprouted": "filizlenmiş", "hulled": "kabuğu soyulmuş",
  "shelled": "kabuğu çıkarılmış", "pitted": "çekirdeksiz", "seedless": "çekirdeksiz", "trimmed": "yağı alınmış",
  "lean": "yağsız et", "fat": "yağ", "separable": "ayrılabilir", "choice": "choice sınıfı",
  "select": "select sınıfı", "prime": "prime sınıfı", "only": "yalnızca", "with": "ile",
  "without": "olmadan", "and": "ve", "or": "veya", "of": "",
  "the": "", "in": "içinde", "for": "için", "from": "",
  "to": "", "added": "eklenmiş", "salt": "Tuz", "skin": "deri",
  "bone": "kemik", "seed": "tohumu", "seeds": "tohumlar", "shell": "kabuk",
  "all": "tüm", "variety": "çeşit", "varieties": "çeşitler", "type": "tür",
  "types": "türler", "style": "usulü", "brand": "marka", "mix": "karışımı",
  "blend": "karışımı", "beef": "dana", "veal": "Dana (genç)", "pork": "Domuz eti",
  "lamb": "Kuzu eti", "mutton": "Koyun eti", "goat": "keçi", "game": "Av eti",
  "chicken": "tavuk", "turkey": "Hindi", "duck": "Ördek", "goose": "Kaz",
  "quail": "Bıldırcın", "pheasant": "Sülün", "ostrich": "Devekuşu", "emu": "Emu",
  "squab": "Güvercin yavrusu", "grouse": "Orman tavuğu", "bison": "Bizon", "buffalo": "Manda",
  "deer": "Geyik", "elk": "Geyik", "rabbit": "Tavşan", "poultry": "Kümes hayvanı",
  "broilers": "piliç", "broiler": "piliç", "fryers": "piliç", "capons": "hadım horoz",
  "hens": "tavuk", "roasting": "fırınlık", "stewing": "haşlamalık", "drumstick": "baget",
  "drumsticks": "baget", "thigh": "but", "thighs": "but", "wing": "kanat",
  "wings": "kanat", "breast": "göğüs", "back": "sırt", "neck": "boyun",
  "giblets": "sakatat", "gizzard": "taşlık", "liver": "ciğer", "heart": "kalp",
  "hearts": "kalp", "kidney": "kuru fasulye (kidney)", "kidneys": "böbrek", "brain": "beyin",
  "brains": "beyin", "tongue": "dil", "tripe": "işkembe", "lungs": "akciğer",
  "spleen": "dalak", "pancreas": "pankreas", "thymus": "timüs", "testes": "testis",
  "feet": "ayak", "head": "baş", "tail": "kuyruk", "ribs": "kaburga",
  "rib": "kaburga", "loin": "bonfile/fileto", "chops": "pirzola", "chop": "pirzola",
  "steak": "biftek", "roast": "rosto", "shoulder": "omuz", "leg": "but",
  "shank": "incik", "brisket": "göğüs", "chuck": "kol", "round": "yuvarlak",
  "rump": "kıç", "sirloin": "sırt", "tenderloin": "bonfile", "flank": "yan",
  "plate": "kaburga altı", "arm": "kol", "blade": "kürek", "eye": "göz",
  "top": "üst", "bottom": "alt", "tip": "uç", "cap": "kapak",
  "short": "kısa", "loaf": "somun/rulo", "patty": "köfte", "patties": "köfte",
  "meatballs": "köfte", "meatloaf": "köfte rulo", "bacon": "bacon", "ham": "jambon",
  "sausage": "sosis", "sausages": "sosis", "salami": "salam", "bologna": "bologna",
  "frankfurter": "sosis", "frankfurters": "sosis", "pepperoni": "pepperoni", "pastrami": "pastırma (pastrami)",
  "liverwurst": "ciğer sosisi", "hot": "acı", "dog": "sosis", "dogs": "sosis",
  "wieners": "sosis", "franks": "sosis", "spareribs": "domuz kaburga", "backribs": "sırt kaburga",
  "belly": "göbek", "jowl": "yanak", "fatback": "sırt yağı", "lard": "Domuz yağı",
  "tallow": "iç yağı", "suet": "iç yağı", "picnic": "omuz", "cutlet": "pirzola",
  "cutlets": "pirzola", "cuts": "kesimler", "meat": "et", "meats": "etler",
  "by-products": "sakatat/yan ürünler", "luncheon": "dilimlik", "deli": "şarküteri", "jerky": "kurutulmuş et",
  "corned": "tuzlu sığır", "sticks": "çubuk", "nuggets": "nugget", "tenders": "şerit",
  "fish": "Balık", "salmon": "Somon", "tuna": "Ton balığı", "cod": "Morina",
  "haddock": "Mezgit (haddock)", "herring": "Ringa", "mackerel": "Uskumru", "sardine": "Sardalya",
  "sardines": "Sardalya", "anchovy": "Hamsi", "trout": "Alabalık", "bass": "Levrek",
  "halibut": "Dil balığı (halibut)", "flounder": "Pisi", "sole": "Dil balığı", "perch": "Tatlı su levreği",
  "pike": "Turna", "carp": "Sazan", "catfish": "Yayın", "tilapia": "Tilapya",
  "snapper": "Snapper (lütfer)", "grouper": "Orfoz", "swordfish": "Kılıç balığı", "shark": "Köpekbalığı",
  "pollock": "Pollock", "whiting": "Mezgit", "mullet": "Kefal", "smelt": "Gümüş balığı",
  "sturgeon": "Mersin", "eel": "Yılan balığı", "whitefish": "Beyaz balık", "bluefin": "mavi yüzgeçli",
  "yellowfin": "sarı yüzgeçli", "skipjack": "çizgili", "mahimahi": "Mahi mahi", "roe": "Balık yumurtası",
  "caviar": "Havyar", "surimi": "Surimi", "shrimp": "Karides", "crab": "Yengeç",
  "lobster": "Istakoz", "crayfish": "Kerevit", "crustaceans": "Kabuklular", "mollusks": "Yumuşakçalar",
  "oyster": "İstiridye", "oysters": "İstiridye", "clam": "Midye (clam)", "clams": "Midye (clam)",
  "mussel": "Midye", "scallop": "Deniz tarağı", "squid": "Kalamar", "octopus": "Ahtapot",
  "abalone": "Abalone", "snail": "Salyangoz", "conch": "Deniz salyangozu", "cuttlefish": "Mürekkep balığı",
  "fillet": "fileto", "fillets": "fileto", "finfish": "Balık", "shellfish": "Kabuklu deniz ürünü",
  "seafood": "Deniz ürünü", "atlantic": "Atlantik", "pacific": "Pasifik", "alaska": "Alaska",
  "sockeye": "sockeye", "chinook": "chinook", "farmed": "çiftlik", "wild": "yabani",
  "kippered": "tütsülenmiş", "ocean": "okyanus", "sea": "deniz", "rainbow": "gökkuşağı",
  "striped": "çizgili", "spiny": "dikenli", "dungeness": "dungeness", "egg": "Yumurta",
  "eggs": "Yumurta", "yolk": "sarısı", "white": "beyaz", "whites": "akı",
  "scrambled": "çırpılmış", "omelet": "omlet", "poached": "poşe", "milk": "Süt",
  "cream": "krema", "yogurt": "Yoğurt", "butter": "ezmesi", "buttermilk": "Ayran/yayık",
  "cheese": "Peynir", "cheeses": "Peynir", "whey": "Peynir altı suyu", "kefir": "Kefir",
  "casein": "Kazein", "custard": "Muhallebi/krema", "ice": "Dondurma/buz", "sherbet": "Şerbet",
  "pudding": "Puding", "cottage": "Cottage", "ricotta": "Ricotta", "mozzarella": "Mozzarella",
  "parmesan": "Parmesan", "cheddar": "Çedar", "swiss": "İsviçre", "provolone": "Provolone",
  "feta": "Beyaz peynir (feta)", "brie": "Brie", "camembert": "Camembert", "gouda": "Gouda",
  "edam": "Edam", "blue": "mavi", "roquefort": "Roquefort", "gruyere": "Gruyère",
  "colby": "Colby", "muenster": "Muenster", "monterey": "Monterey", "mexican": "Meksika",
  "american": "Amerikan", "sour": "ekşi", "whipped": "çırpılmış", "half": "yarım",
  "sheep": "koyun", "creamer": "krema (kahve için)", "eggnog": "Eggnog", "apple": "Elma",
  "apples": "Elma", "apricot": "Kayısı", "apricots": "Kayısı", "avocado": "Avokado",
  "avocados": "Avokado", "banana": "muz", "bananas": "Muz", "blackberries": "Böğürtlen",
  "blackberry": "Böğürtlen", "blueberries": "Yaban mersini", "blueberry": "Yaban mersini", "cantaloupe": "Kavun",
  "cherries": "Kiraz", "cherry": "kiraz", "cranberries": "Kızılcık", "cranberry": "Kızılcık",
  "currants": "Frenk üzümü", "dates": "Hurma", "date": "Hurma", "figs": "İncir",
  "fig": "İncir", "grapefruit": "Greyfurt", "grapes": "Üzüm", "grape": "Üzüm",
  "guava": "Guava", "guavas": "Guava", "honeydew": "Bal kavunu", "kiwi": "Kivi",
  "kiwifruit": "Kivi", "kumquats": "Kamkat", "lemon": "Limon", "lemons": "Limon",
  "lime": "Misket limonu", "limes": "Misket limonu", "lychee": "Liçi", "lychees": "Liçi",
  "mango": "Mango", "mangos": "Mango", "melons": "Kavun", "melon": "Kavun",
  "mulberries": "Dut", "nectarines": "Nektarin", "olives": "Zeytin", "olive": "Zeytin",
  "orange": "turuncu", "oranges": "Portakal", "papaya": "Papaya", "papayas": "Papaya",
  "passion": "Passiflora", "passion-fruit": "Çarkıfelek meyvesi", "peach": "Şeftali", "peaches": "Şeftali",
  "pear": "Armut", "pears": "Armut", "persimmons": "Hurma (trabzon)", "pineapple": "Ananas",
  "plantains": "Pişirmelik muz", "plums": "Erik", "plum": "Erik", "pomegranates": "Nar",
  "pomegranate": "Nar", "prunes": "Kuru erik", "quinces": "Ayva", "raisins": "Kuru üzüm",
  "raspberries": "Ahududu", "raspberry": "Ahududu", "rhubarb": "Işkın", "strawberries": "Çilek",
  "strawberry": "Çilek", "tangerines": "Mandalina", "tangerine": "Mandalina", "mandarin": "Mandalina",
  "watermelon": "Karpuz", "loquats": "Yenidünya", "coconut": "Hindistan cevizi", "coconuts": "Hindistan cevizi",
  "fruit": "meyve", "fruits": "Meyveler", "juice": "suyu", "nectar": "nektar",
  "applesauce": "Elma püresi", "smoothie": "smoothie", "currant": "Frenk üzümü", "elderberries": "Mürver",
  "gooseberries": "Bektaşi üzümü", "boysenberries": "Boysenberi", "breadfruit": "Ekmek ağacı meyvesi", "carambola": "Karambola",
  "cherimoya": "Çerimoya", "durian": "Durian", "feijoa": "Feijoa", "goji": "Goji",
  "jackfruit": "Jakfruit", "mangosteen": "Mangostan", "pummelo": "Pomelo", "rambutan": "Rambutan",
  "soursop": "Soursop", "tamarinds": "Demirhindi", "abiyuch": "Abiyuch", "crabapples": "Elma (yaban)",
  "muscadine": "Muscadine", "casaba": "Casaba kavunu", "artichokes": "Enginar", "artichoke": "Enginar",
  "arugula": "Roka", "asparagus": "Kuşkonmaz", "beets": "Pancar", "beet": "Pancar",
  "broccoli": "Brokoli", "brussels": "Brüksel", "sprouts": "lahanası/filizi", "cabbage": "Lahana",
  "carrots": "Havuç", "carrot": "Havuç", "cauliflower": "Karnabahar", "celery": "Kereviz sapı",
  "celeriac": "Kereviz", "chard": "Pazı", "chicory": "Hindiba", "collards": "Karalahana",
  "corn": "Mısır", "cucumber": "Salatalık", "cucumbers": "Salatalık", "eggplant": "Patlıcan",
  "endive": "Endivyen", "garlic": "Sarımsak", "ginger": "Zencefil", "kale": "Kara lahana",
  "kohlrabi": "Alabaş", "leeks": "Pırasa", "leek": "Pırasa", "lettuce": "Marul",
  "mushrooms": "Mantar", "mushroom": "mantar", "okra": "Bamya", "onions": "Soğan",
  "onion": "Soğan", "parsnips": "Yaban havucu", "peas": "Bezelye", "pea": "Bezelye",
  "peppers": "Biber", "pepper": "Karabiber", "potatoes": "Patates", "potato": "Patates",
  "pumpkin": "Balkabağı", "radishes": "Turp", "radish": "Turp", "rutabaga": "Turpgil",
  "spinach": "Ispanak", "squash": "Kabak", "tomatoes": "Domates", "tomato": "domates",
  "turnips": "Şalgam", "turnip": "Şalgam", "watercress": "Su teresi", "zucchini": "Kabak (sakız)",
  "scallions": "Taze soğan", "shallots": "Arpacık soğanı", "cress": "Tere", "dandelion": "Karahindiba",
  "lotus": "Lotus", "taro": "Taro", "yam": "Yam", "yams": "Yam",
  "cassava": "Manyok", "jicama": "Yer elması (jicama)", "sweet": "tatlı", "sweetpotato": "Tatlı patates",
  "beans": "Fasulye", "bean": "Fasulye", "sauerkraut": "Lahana turşusu", "kimchi": "Kimçi",
  "pickles": "Turşu", "pickle": "Turşu", "relish": "Turşu sosu", "seaweed": "Deniz yosunu",
  "kelp": "Deniz yosunu", "spirulina": "Spirulina", "romaine": "Yeşil marul", "iceberg": "Göbek marul",
  "leaf": "yaprak", "leaves": "yaprakları", "greens": "yeşillikleri", "sprout": "filiz",
  "vegetable": "sebze", "vegetables": "Sebzeler", "pods": "kabukları", "snap": "çıtır",
  "green": "yeşil", "red": "kırmızı", "yellow": "sarı", "purple": "mor",
  "black": "siyah", "brown": "kahverengi", "pink": "pembe", "dark": "koyu",
  "salad": "Salata", "coleslaw": "Lahana salatası", "tomatillos": "Tomatillo", "chayote": "Chayote",
  "cardoon": "Kenger", "purslane": "Semizotu", "fennel": "Rezene", "bulb": "soğanı",
  "bamboo": "Bambu", "shoots": "filizi", "pimiento": "Kırmızı biber (pimiento)", "jalapeno": "Jalapeno",
  "chili": "Chili", "chile": "Acı biber", "bell": "dolma", "tuber": "yumru",
  "roots": "kökleri", "root": "kökü", "lentils": "Mercimek", "lentil": "Mercimek",
  "chickpeas": "Nohut", "chickpea": "Nohut", "chick pea": "Nohut", "peanut": "yer fıstığı",
  "peanuts": "Yer fıstığı", "soybeans": "Soya fasulyesi", "soybean": "soya", "soy": "Soya",
  "tofu": "Tofu", "tempeh": "Tempeh", "miso": "Miso", "natto": "Natto",
  "hummus": "Humus", "falafel": "Falafel", "lupins": "Acı bakla", "pinto": "pinto",
  "navy": "barbunya (navy)", "cowpeas": "Börülce", "limas": "Lima fasulyesi", "lima": "Lima",
  "broadbeans": "Bakla", "fava": "Bakla", "mung": "Maş fasulyesi", "mungo": "Maş",
  "pigeonpeas": "Güvercin bezelyesi", "hyacinth": "sümbül", "adzuki": "Adzuki", "refried": "ezilmiş kızarmış",
  "legumes": "Baklagiller", "almonds": "Badem", "almond": "Badem", "walnuts": "Ceviz",
  "walnut": "Ceviz", "hazelnuts": "Fındık", "hazelnut": "Fındık", "filberts": "Fındık",
  "cashew": "Kaju", "cashews": "Kaju", "pistachio": "Antep fıstığı", "pistachios": "Antep fıstığı",
  "pecans": "Pekan cevizi", "pecan": "Pekan cevizi", "macadamia": "Makadamya", "chestnuts": "Kestane",
  "chestnut": "Kestane", "brazilnuts": "Brezilya cevizi", "pine": "çam", "pinyon": "çam fıstığı",
  "nuts": "Kuruyemiş", "nut": "Kuruyemiş", "sesame": "Susam", "sunflower": "ayçiçeği",
  "flax": "Keten", "flaxseed": "Keten tohumu", "chia": "Chia", "hemp": "Kenevir",
  "poppy": "Haşhaş", "tahini": "Tahin", "paste": "ezmesi", "ginkgo": "Ginkgo",
  "wheat": "buğday", "rice": "Pirinç", "oat": "Yulaf", "oats": "Yulaf",
  "barley": "Arpa", "rye": "Çavdar", "cornmeal": "Mısır unu", "cornstarch": "Mısır nişastası",
  "millet": "Darı", "quinoa": "Kinoa", "buckwheat": "Karabuğday", "bulgur": "Bulgur",
  "couscous": "Kuskus", "sorghum": "Sorgum", "amaranth": "Horozibiği", "spelt": "Kaplıca buğdayı",
  "semolina": "İrmik", "pasta": "Makarna", "spaghetti": "Spagetti", "macaroni": "Makarna",
  "noodles": "Erişte", "noodle": "erişte", "vermicelli": "Şehriye", "lasagna": "Lazanya",
  "flour": "Un", "bran": "Kepek", "germ": "Çekirdek", "grain": "Tahıl",
  "grains": "Tahıllar", "cereal": "Tahıl gevreği", "cereals": "Tahıl gevrekleri", "oatmeal": "Yulaf ezmesi",
  "granola": "Granola", "bread": "ekmek", "breads": "Ekmek", "bagel": "Simit (bagel)",
  "bagels": "Simit (bagel)", "bun": "Çörek", "buns": "Çörek", "rolls": "Çörek",
  "roll": "Çörek", "biscuit": "Bisküvi", "biscuits": "Bisküvi", "cracker": "Kraker",
  "crackers": "Kraker", "cookie": "Kurabiye", "cookies": "Kurabiye", "cake": "Kek",
  "cakes": "Kek", "pie": "Turta", "pies": "Turta", "muffin": "Muffin",
  "muffins": "Muffin", "pancakes": "Pankek", "waffles": "Waffle", "doughnuts": "Donut",
  "croissants": "Kruvasan", "pita": "Pide", "tortillas": "Tortilla", "tortilla": "Tortilla",
  "pizza": "Pizza", "brownies": "Brownie", "pastry": "Hamur işi", "pastries": "Hamur işleri",
  "dough": "Hamur", "whole-grain": "tam tahıllı", "whole grain": "tam tahıl", "all-purpose": "çok amaçlı",
  "composite": "karma", "retail": "perakende", "flesh": "et", "very": "çok", "medium-grain": "orta taneli", "long-grain": "uzun taneli", "short-grain": "kısa taneli", "popcorn": "Patlamış mısır", "chips": "Cips", "pretzels": "Pretzel",
  "oil": "yağı", "oils": "yağlar", "margarine": "Margarin", "shortening": "Katı yağ (shortening)",
  "ghee": "Sade yağ", "mayonnaise": "Mayonez", "dressing": "Sos (salata)", "vinegar": "Sirke",
  "canola": "Kanola", "safflower": "Aspir", "cottonseed": "pamuk yağı", "palm": "palm",
  "sugar": "şeker", "sugars": "Şeker", "honey": "Bal", "syrup": "şurubu",
  "syrups": "Şuruplar", "molasses": "Pekmez", "jam": "Reçel", "jelly": "Jöle",
  "jellies": "Jöle", "marmalade": "Marmelat", "candy": "Şekerleme", "candies": "Şekerleme",
  "chocolate": "Çikolata", "cocoa": "Kakao", "caramel": "Karamel", "fudge": "Fudge",
  "gelatin": "Jelatin", "marshmallows": "Marshmallow", "frosting": "Krema (pasta)", "topping": "Sos",
  "toppings": "Soslar", "sweetener": "Tatlandırıcı", "sweeteners": "Tatlandırıcılar", "maple": "akçaağaç",
  "carob": "Harnup", "water": "Su", "beverage": "İçecek", "beverages": "İçecekler",
  "drink": "İçecek", "drinks": "İçecekler", "coffee": "Kahve", "tea": "Çay",
  "soda": "Gazoz", "cola": "Kola", "lemonade": "Limonata", "beer": "Bira",
  "wine": "Şarap", "whiskey": "Viski", "vodka": "Votka", "rum": "Rom",
  "gin": "Cin", "liquor": "Likör", "cocktail": "kokteyl", "alcoholic": "Alkollü",
  "carbonated": "gazlı", "energy": "Enerji içeceği", "sports": "Spor", "tonic": "Tonik",
  "punch": "Punch", "shake": "Shake", "milkshake": "Milkshake", "cider": "şıra",
  "cinnamon": "Tarçın", "cumin": "Kimyon", "paprika": "Toz kırmızı biber", "turmeric": "Zerdeçal",
  "oregano": "Kekik (oregano)", "thyme": "Kekik", "basil": "Fesleğen", "parsley": "Maydanoz",
  "dill": "Dereotu", "mint": "Nane", "peppermint": "Nane", "spearmint": "Yeşil nane",
  "rosemary": "Biberiye", "sage": "Adaçayı", "bay": "Defne", "coriander": "Kişniş",
  "cilantro": "Kişniş", "cardamom": "Kakule", "cloves": "Karanfil", "clove": "Karanfil",
  "nutmeg": "Muskat", "mace": "Küçük hindistan cevizi", "saffron": "Safran", "vanilla": "Vanilya",
  "mustard": "Hardal", "horseradish": "Yaban turpu", "curry": "Köri", "cayenne": "Kırmızı acı biber",
  "allspice": "Yenibahar", "anise": "Anason", "fenugreek": "Çemen", "tarragon": "Tarhun",
  "marjoram": "Mercanköşk", "chervil": "Frenk maydanozu", "capers": "Kapari", "spices": "Baharatlar",
  "spice": "Baharat", "herb": "Ot", "herbs": "Otlar", "flakes": "gevreği",
  "extract": "özü", "yeast": "Maya", "soup": "Çorba", "soups": "Çorbalar",
  "broth": "Et suyu", "stock": "Stok", "bouillon": "Bulyon", "sauce": "Sos",
  "sauces": "Soslar", "gravy": "Et sosu", "ketchup": "Ketçap", "salsa": "Salsa",
  "stew": "Güveç", "entree": "Ana yemek", "entrees": "Ana yemekler", "dinner": "Akşam yemeği",
  "meal": "Yemek", "meals": "Yemekler", "sandwich": "Sandviç", "sandwiches": "Sandviç",
  "burrito": "Burrito", "taco": "Taco", "tacos": "Taco", "ravioli": "Ravioli",
  "casserole": "Güveç", "dumpling": "Mantı", "dumplings": "Mantı", "sushi": "Suşi",
  "pilaf": "Pilav", "recipe": "tarif", "gravies": "soslar", "products": "ürünleri",
  "product": "ürünü", "foods": "gıdalar", "food": "gıda", "snack": "atıştırmalık",
  "snacks": "Atıştırmalıklar", "bar": "bar", "bars": "bar", "chip": "cips",
  "baby": "bebek", "infant": "bebek", "formula": "formül", "diet": "diyet",
  "dietetic": "diyet", "imitation": "taklit", "substitute": "alternatifi", "substitutes": "alternatifleri",
  "analog": "analog", "usda": "USDA", "usa": "ABD", "us": "ABD",
  "new": "yeni", "zealand": "Zelanda", "australian": "Avustralya", "canadian": "Kanada",
  "chinese": "Çin", "japanese": "Japon", "french": "Fransız", "italian": "İtalyan",
  "spanish": "İspanyol", "greek": "Yunan", "indian": "Hint", "thai": "Tay",
  "korean": "Kore", "polish": "Polonya", "german": "Alman", "russian": "Rus",
  "hawaiian": "Hawaii", "european": "Avrupa", "oriental": "Doğu", "asian": "Asya",
  "tropical": "tropikal", "northern": "kuzey", "eastern": "doğu", "western": "batı",
  "southern": "güney", "california": "Kaliforniya", "florida": "Florida", "texas": "Teksas",
  "cuban": "Küba", "cajun": "Cajun", "turkish": "Türk", "lebanese": "Lübnan",
  "ranch": "ranch", "calcium": "kalsiyum", "iron": "demir", "protein": "protein",
  "vitamin": "vitamin", "sodium": "sodyum", "ascorbic": "askorbik", "acid": "asit",
  "fiber": "lif", "carbohydrate": "karbonhidrat", "caffeine": "kafein", "cholesterol": "kolesterol",
  "saturated": "doymuş", "unsaturated": "doymamış", "partially": "kısmen", "hydrogenated": "hidrojenlenmiş",
  "pack": "paket", "packed": "paketlenmiş", "package": "paket", "packaged": "paketli",
  "bottled": "şişelenmiş", "tablespoon": "yemek kaşığı", "cup": "bardak", "cups": "bardak",
  "slice": "dilim", "piece": "parça", "pieces": "parçalar", "chunks": "parçalar",
  "chunk": "parça", "strips": "şerit", "strip": "şerit", "balls": "toplar",
  "cubes": "küp", "slices": "dilim", "filling": "iç", "filled": "dolgulu",
  "coated": "kaplı", "topped": "üstü kaplı", "covered": "kaplı", "creamy": "kremalı",
  "crunchy": "gevrek", "crisp": "gevrek", "crispy": "gevrek", "smooth": "pürüzsüz",
  "chunky": "parçalı", "original": "orijinal", "classic": "klasik", "natural": "doğal",
  "superfood": "süper gıda", "healthy": "sağlıklı", "nutritional": "besleyici", "supplement": "takviye",
  "complete": "komple", "additional": "ek", "number": "no", "about": "yaklaşık",
  "approximately": "yaklaşık", "average": "ortalama", "small": "küçük", "large": "büyük",
  "jumbo": "jumbo", "mini": "mini", "big": "büyük", "little": "küçük",
  "long": "uzun", "flat": "yassı", "golden": "altın", "delicious": "delicious",
  "hamburger": "Hamburger", "cheeseburger": "Çizburger", "hotdog": "Sosisli", "fries": "Patates kızartması",
  "pot": "tencere", "truffle": "Trüf", "pasteurized": "pastörize", "process": "işlenmiş",
  "processed": "işlenmiş", "spread": "sürülebilir", "dip": "dip sos", "puree": "püre",

};

// İkinci geçişte, çevrilmeden kalan sık kelimeler için eklenen girişler (ilk blokla çakışırsa bu kazanır).
Object.assign(WORDS, {
  heat: "ısıl işlem görmüş", species: "türleri", choice: "choice sınıfı", select: "select sınıfı", kernels: "taneleri", grades: "sınıfları",
  tofu: "Tofu", bacon: "Bacon", taro: "Taro", crumbles: "ufak parçalar", industrial: "endüstriyel", winter: "kış", made: "yapılmış", quick: "hızlı",
  defatted: "yağı alınmış", meatless: "etsiz", bar: "bar", fluid: "sıvı", queso: "peyniri (queso)", shortening: "katı yağ", "oil-roasted": "yağda kavrulmuş",
  bleached: "ağartılmış", unbleached: "ağartılmamış", mechanically: "mekanik olarak", restaurant: "restoran", sulfate: "sülfat", degermed: "çekirdeksiz",
  cooking: "pişirme", inside: "iç", bologna: "Bologna", grits: "Mısır irmiği (grits)", flavor: "aromalı", flavors: "aromalı", "low-moisture": "düşük nemli",
  full: "tam", domesticated: "evcil", peel: "kabuğu", breakfast: "kahvaltı", gourd: "Su kabağı", shiitake: "Shiitake mantarı", summer: "yaz", malt: "Malt",
  pollock: "Pollock", alcohol: "alkol", kernel: "tanesi", drum: "davul/but", outside: "dış", pigeon: "güvercin", deboned: "kemiksiz", solution: "çözeltisi",
  unspecified: "belirtilmemiş", puffed: "şişirilmiş", moisture: "nem", lotus: "Lotus", flower: "çiçek", winged: "kanatlı", portabella: "Portabella mantarı",
  tree: "ağaç", glandless: "glandsız", expressed: "sıkılmış", "grass-fed": "otla beslenmiş", shortribs: "kısa kaburga", vegetarian: "vejetaryen",
  nigari: "nigari", crude: "ham", "fresh-refrigerated": "taze soğutulmuş", dessert: "tatlı", fan: "yelpaze", total: "toplam", barbecue: "barbekü",
  based: "bazlı", "prepared-from-recipe": "tariften hazırlanmış", "chocolate-flavored": "çikolata aromalı", common: "yaygın", traditional: "geleneksel",
  includes: "içerir", areas: "bölgeleri", carcass: "karkas", separated: "ayrılmış", exposed: "maruz bırakılmış", ultraviolet: "ultraviyole", navy: "barbunya",
  pinto: "Pinto fasulye", english: "İngiliz", decorticated: "kabuğu soyulmuş", desiccated: "kurutulmuş", isolate: "izolat", citrus: "narenciye", rich: "zengin",
  punch: "Punch", turtle: "Kaplumbağa", haddock: "Mezgit (haddock)", sablefish: "Sablefish", purchased: "satın alınmış", king: "king", chinook: "chinook", sockeye: "sockeye",
  halibut: "Dil balığı (halibut)", may: "olabilir", moist: "nemli", valencia: "valencia", virginia: "virginia", "gluten-free": "glütensiz", masa: "Masa unu",
  burrito: "Burrito", "barbecue-flavor": "barbekü aromalı", colby: "Colby peyniri", caraway: "Çörek otu (caraway)", monterey: "Monterey", muenster: "Muenster",
  provolone: "Provolone", cultured: "kültürlü", ricotta: "Ricotta", whipping: "çırpmalık", part: "kısmen", cold: "soğuk", weed: "otu", seasoning: "baharat karışımı",
  poppyseed: "Haşhaş tohumu", animal: "hayvansal", calorie: "kalorili", frying: "kızartma", duty: "ağır", caesar: "Sezar", guinea: "gine", hen: "tavuk", edible: "yenilebilir",
  pate: "Ezme (pate)", skinless: "derisiz", cornish: "Cornish", seasoned: "baharatlı", wasabi: "Wasabi", jus: "Et suyu", dip: "Dip sos", tartar: "Tartar",
  wonton: "Wonton", cubed: "küp doğranmış", granola: "Granola", farina: "Farina", not: "değil", prune: "Kuru erik", candied: "şekerlenmiş", jujube: "Hünnap", litchis: "Liçi",
  longans: "Longan", seeded: "çekirdekli", tart: "ekşi", acerola: "Acerola", mango: "Mango", papaya: "Papaya", tamarind: "Demirhindi", mamey: "Mamey", anjou: "Anjou armudu",
  nance: "Nance", sucralose: "sükraloz", delicious: "delicious", latino: "Latin", undiluted: "sulandırılmamış", "pre-sliced": "önceden dilimlenmiş", ears: "koçanı",
  "country-style": "köy usulü", catsup: "Ketçap", yam: "Yam", chives: "Frenk soğanı", nopales: "Nopal (kaktüs)", pepeao: "Kulak mantarı", arrowroot: "Ararot",
  arrowhead: "Ok başı", yardlong: "uzun", raab: "Rabe", fiddlehead: "Eğrelti otu filizi", ferns: "Eğrelti otu", hamburger: "Hamburger", chrysanthemum: "Krizantem",
  agar: "Agar", jalapeno: "Jalapeno biberi", spirulina: "Spirulina", leafy: "yapraklı", "edible-podded": "kabuğu yenilen", edamame: "Edamame", fern: "Eğrelti otu",
  "stir-fried": "soteli", young: "genç", spring: "bahar", globe: "küre", "balsam-pear": "Acı kavun", bitter: "acı", blackeyes: "Börülce", using: "kullanılarak",
  acorn: "Meşe palamudu", butternut: "Butternut kabağı", russet: "russet", waterchestnuts: "Su kestanesi", artificial: "yapay", acorns: "Meşe palamudu",
  blanched: "haşlanıp soğutulmuş", breadnut: "Ekmek cevizi", unblanched: "haşlanmamış", lightly: "hafif", prime: "prime sınıfı", cut: "kesim", "non-alcoholic": "alkolsüz",
  daiquiri: "Daiquiri", berry: "meyve", pina: "Pina", colada: "Colada", clam: "Midye (clam)", creme: "krema", cusk: "Cusk", ling: "Ling", spot: "Spot", scup: "Scup",
  cisco: "Cisco", burbot: "Burbot", lingcod: "Lingcod", bluefish: "Bluefish", milkfish: "Milkfish", monkfish: "Fener balığı", tilefish: "Tilefish", butterfish: "Butterfish",
  sheepshead: "Sheepshead", flatfish: "Yassı balık", pout: "Pout", chum: "Chum", walleye: "Walleye", sucker: "Sucker", shad: "Shad", roughy: "Roughy", freshwater: "tatlı su",
  pompano: "Pompano", turbot: "Kalkan", greenland: "Grönland", queen: "queen", wolffish: "Kurt balığı", contain: "içeren", additives: "katkılar", retain: "tutan",
  coho: "coho", channel: "kanal", tempeh: "Tempeh", shoyu: "Shoyu (soya sosu)", hydrolyzed: "hidrolize", "dried-frozen": "dondurularak kurutulmuş", koyadofu: "Koyadofu",
  fermented: "fermente", fuyu: "fuyu", adzuki: "Adzuki fasulyesi", produced: "üretilmiş", unfortified: "zenginleştirilmemiş", gram: "gram", vitamin: "vitamin",
  mineral: "mineral", magnesium: "magnezyum", chloride: "klorür", great: "büyük", "dry-roasted": "kuru kavrulmuş", roman: "roman", bear: "Ayı", moose: "Mus (geyik)",
  horse: "At", beaver: "Kunduz", muskrat: "Misk faresi", caribou: "Karibu", squirrel: "Sincap", seam: "birleşim", antelope: "Antilop", external: "dış", boar: "Yaban domuzu",
  fore: "ön", hind: "arka", croutons: "Kruton", multigrain: "çok tahıllı", pumpernickel: "Pumpernickel ekmeği", toaster: "tost makinesi", leavening: "mayalayıcı",
  agents: "maddeler", gluten: "glüten", chewing: "çiğneme", gum: "sakız", preserves: "Reçel", pectin: "Pektin", butterscotch: "Butterscotch", tapioca: "Tapyoka",
  leather: "pestil", triticale: "Triticale", bulgur: "Bulgur", teff: "Teff", pearled: "inci", hominy: "Hominy", groats: "kırığı", soba: "Soba", somen: "Somen",
  "protein-fortified": "protein zenginleştirilmiş", glutinous: "yapışkan", microwavable: "mikrodalgaya uygun", "cheese-filled": "peynir dolgulu", box: "kutu",
  trail: "Trail mix", "cheese-flavor": "peynir aromalı", dulce: "dulce", leche: "leche", sundae: "Sundae", cone: "kornet", brie: "Brie peyniri", edam: "Edam peyniri",
  feta: "Beyaz peynir (feta)", gouda: "Gouda peyniri", brick: "tuğla", tilsit: "Tilsit", romano: "Romano", fontina: "Fontina", gjetost: "Gjetost", cheshire: "Cheshire",
  limburger: "Limburger", roquefort: "Roquefort", camembert: "Camembert", neufchatel: "Neufchâtel", port: "Port", salut: "Salut", anhydrous: "susuz", pressurized: "basınçlı",
  clarified: "arıtılmış", base: "bazlı", "non-soy": "soya içermeyen", "non-fat": "yağsız", fresco: "fresco", blanco: "blanco", semisoft: "yarı yumuşak", anejo: "añejo",
  cotija: "Cotija", seco: "seco", asadero: "Asadero", mixture: "karışımı", cottage: "Cottage peyniri", chihuahua: "Chihuahua", serve: "servis", semi: "yarı", table: "sofra",
  balsamic: "balzamik", distilled: "damıtılmış", savory: "Sater", oregano: "Kekik (oregano)", household: "ev tipi", grapeseed: "Üzüm çekirdeği", lecithin: "Lesitin",
  grease: "yağı", confectionery: "şekerleme", pressed: "sıkılmış", tub: "kap", "mayonnaise-type": "mayonez tipi", foie: "Foie", gras: "gras", ruffed: "ruffed", canada: "Kanada",
  frames: "iskelet", worcestershire: "Worcestershire sosu", alfredo: "Alfredo", sriracha: "Sriracha", hoisin: "Hoisin", teriyaki: "Teriyaki", sofrito: "Sofrito", fin: "yüzgeç",
  minestrone: "Minestrone", ramen: "Ramen", any: "herhangi", verde: "verde", blood: "kan", scrapple: "Scrapple", headcheese: "Başsucuk", luxury: "lüks", ginkgo: "Ginkgo",
  tahitian: "Tahiti", salsify: "Yer lahanası", succotash: "Mısırlı bakla", puffs: "kabarcıklar", scalloped: "graten", gratin: "graten", hubbard: "Hubbard kabağı", hash: "hash",
  "o'brien": "O'Brien", borage: "Hodan", butterbur: "Butterbur", sesbania: "Sesbania", dock: "Evelik", ham: "jambon", cheddar: "Çedar", mozzarella: "Mozzarella",
  parmesan: "Parmesan", lima: "Lima fasulyesi", kidney: "kuru fasulye (kidney)", tortilla: "Tortilla", salsa: "Salsa", chili: "Acı biber", light: "hafif", protein: "protein",
});

// Çevrilmemesi gereken, genel olarak bilinen/uluslararası adlar zaten sözlükte "kendisi" olarak yer alır.

function lookupWord(raw: string): string | undefined {
  const key = raw.toLowerCase();
  if (key in WORDS) return WORDS[key];
  // Çoğul ekleri: "peppers" -> "pepper", "berries" -> "berry", "tomatoes" -> "tomato".
  if (key.endsWith("ies") && key.slice(0, -3) + "y" in WORDS) return WORDS[key.slice(0, -3) + "y"];
  if (key.endsWith("es") && key.slice(0, -2) in WORDS) return WORDS[key.slice(0, -2)];
  if (key.endsWith("s") && key.slice(0, -1) in WORDS) return WORDS[key.slice(0, -1)];
  return undefined;
}

function translateWord(token: string): string {
  // Sözcüğü saran parantez/noktalama korunur: "(includes", "pork)", "fat."
  const match = /^([("'/]*)([^()'"/.;:]*?)([)"'/.;:]*)$/.exec(token);
  if (!match) return token;
  const [, lead, core, trail] = match;
  if (!core) return token;
  if (/^[\d%./-]+$/.test(core)) return token; // sayı/yüzde/oran
  const translated = lookupWord(core);
  return `${lead}${translated === undefined ? core : translated}${trail}`;
}

function translateSegment(segment: string): string {
  const key = segment.trim().toLowerCase();
  if (key in PHRASES) return PHRASES[key];
  return segment
    .trim()
    .split(/\s+/)
    .map(translateWord)
    .filter((word) => word !== "")
    .join(" ");
}

function capitalize(text: string): string {
  return text.length === 0 ? text : text[0].toLocaleUpperCase("tr-TR") + text.slice(1);
}

const MEAT_HEADS = new Set(["beef", "pork", "lamb", "veal", "chicken", "turkey", "bison"]);

export function translateDescription(description: string): string {
  let parts = description.split(/,\s*/).filter(Boolean);
  // "Oil, olive, salad or cooking" -> "Zeytin yağı, ..." (Türkçede yağın türü önce gelir).
  if (parts.length >= 2 && parts[0].trim().toLowerCase() === "oil") {
    parts = [`${parts[1].trim()} oil`, ...parts.slice(2)];
  }
  const isMeat = MEAT_HEADS.has((parts[0] ?? "").trim().toLowerCase());
  const translated = parts
    // Etlerde "ground" kıyma demektir; baharatlarda "öğütülmüş" (sözlükteki varsayılan).
    .map((part) => (isMeat && part.trim().toLowerCase() === "ground" ? "kıyma" : translateSegment(part)))
    .filter(Boolean);
  // Sözlük değerleri isim olarak büyük harfle yazıldığı için cümle ortasında küçültülür; yalnızca
  // ilk harf büyük bırakılır ("Elma, çiğ, kabuklu").
  return capitalize(translated.join(", ").toLocaleLowerCase("tr-TR"));
}

// Türkçe adın ne kadarının sözlükten geldiğini ölçer (test/kalite kontrolü için).
export function translationCoverage(description: string): number {
  const tokens = description
    .split(/[,\s]+/)
    .map((token) => token.replace(/[()"'/.;:]/g, ""))
    .filter((token) => token && !/^[\d%./-]+$/.test(token));
  if (tokens.length === 0) return 1;
  const known = tokens.filter((token) => lookupWord(token) !== undefined).length;
  return known / tokens.length;
}
