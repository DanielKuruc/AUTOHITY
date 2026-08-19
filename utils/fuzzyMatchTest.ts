/**
 * FUZZY MATCHING TEST - Levenshtein Distance
 * Testování matchování modelů z různých značek a API
 */

// ✅ Levenshtein Distance - Calculate string similarity
const levenshteinDistance = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return shorter.length;

  let editDistances: number[] = Array(shorter.length + 1)
    .fill(null)
    .map((_, i) => i);

  for (let i = 1; i <= longer.length; i++) {
    let editDistance = [i];
    for (let j = 1; j <= shorter.length; j++) {
      editDistance[j] = Math.min(
        editDistance[j - 1] + 1,
        editDistances[j] + 1,
        editDistances[j - 1] +
          (longer[i - 1] === shorter[j - 1] ? 0 : 1),
      );
    }
    editDistances = editDistance;
  }
  return editDistances[shorter.length];
};

// ✅ Find closest matching model
const findClosestModel = (
  apiModel: string,
  availableModels: string[],
): { model: string; distance: number; similarity: number } => {
  // Nejdřív zkus exact match
  if (availableModels.includes(apiModel)) {
    return { model: apiModel, distance: 0, similarity: 1.0 };
  }

  // Pak najdi nejpodobnější
  let closest = availableModels.find((m) => m !== "---Výběr---") || "---Výběr---";
  let minDistance = levenshteinDistance(apiModel, closest);

  for (const model of availableModels) {
    if (model === "---Výběr---") continue;
    const distance = levenshteinDistance(apiModel, model);
    if (distance < minDistance) {
      minDistance = distance;
      closest = model;
    }
  }

  const similarity = 1 - minDistance / Math.max(apiModel.length, closest.length);
  return { model: closest, distance: minDistance, similarity };
};

// ✅ TEST DATA - Skutečné značky a modely
const testCases = [
  // MERCEDES-BENZ
  {
    brand: "Mercedes-Benz",
    availableModels: ["---Výběr---", "A-Class", "C-Class", "E-Class", "GL 350", "GL 200", "GLA", "GLC", "GLE", "S-Class"],
    apiResponses: [
      "GL 350 BLUETEC 4MATIC",
      "GL 350",
      "C-Class AMG",
      "E-Class DIESEL",
      "A-Class SPORT",
      "GLE 350D 4MATIC",
      "S 500 AMG",
    ],
  },

  // BMW
  {
    brand: "BMW",
    availableModels: ["---Výběr---", "X5", "X3", "M340i", "M440i", "Z4", "318i", "320i", "330i", "M5"],
    apiResponses: [
      "X5 XDRIVE",
      "X5 M SPORT",
      "X3 DIESEL",
      "M340i SPORT",
      "Z4 CONVERTIBLE",
      "M5 COMPETITION",
      "318i TURBO",
    ],
  },

  // AUDI
  {
    brand: "Audi",
    availableModels: ["---Výběr---", "A4", "A6", "A8", "Q3", "Q5", "Q7", "RS6", "TT"],
    apiResponses: [
      "A4 TFSI",
      "A4 2.0 TDI",
      "A6 DIESEL 2.0",
      "Q5 QUATTRO",
      "Q7 4.2 TDI",
      "RS6 COMPETITION",
      "A8 PLUG-IN",
    ],
  },

  // VOLKSWAGEN
  {
    brand: "Volkswagen",
    availableModels: ["---Výběr---", "Golf", "Passat", "Tiguan", "T-Roc", "Touareg", "Jetta", "Polo"],
    apiResponses: [
      "Golf 7 TSI",
      "Golf 8 DIESEL",
      "Passat COMFORTLINE",
      "Tiguan HIGHLINE",
      "Touareg DIESEL",
      "Polo TSI SPORT",
      "T-Roc TRENDLINE",
    ],
  },

  // ŠKODA
  {
    brand: "Škoda",
    availableModels: ["---Výběr---", "Octavia", "Superb", "Fabia", "Scala", "Karoq", "Kodiaq"],
    apiResponses: [
      "Octavia COMFORTLINE",
      "Octavia RS",
      "Superb DIESEL",
      "Fabia TSI",
      "Scala SPORT",
      "Kodiaq EDITION",
    ],
  },

  // FORD
  {
    brand: "Ford",
    availableModels: ["---Výběr---", "Focus", "Fiesta", "Mondeo", "Kuga", "Edge", "Fusion"],
    apiResponses: [
      "Focus ST",
      "Focus DIESEL TDCI",
      "Mondeo 2.0 TDCI",
      "Kuga TITANIUM",
      "Fiesta ECOBOOST",
      "Edge DIESEL",
    ],
  },

  // RENAULT
  {
    brand: "Renault",
    availableModels: ["---Výběr---", "Megane", "Clio", "Scenic", "Duster", "Kadjar"],
    apiResponses: [
      "Megane 1.5 DIESEL",
      "Megane RS",
      "Clio TURBO",
      "Scenic DIESEL",
      "Duster DIESEL 4WD",
      "Kadjar EDITION",
    ],
  },

  // HYUNDAI
  {
    brand: "Hyundai",
    availableModels: ["---Výběr---", "i30", "i20", "Tucson", "Santa Fe", "Elantra", "Kona"],
    apiResponses: [
      "i30 1.6 DIESEL",
      "i30 TURBO",
      "Tucson DIESEL CRDI",
      "Santa Fe 2.2 DIESEL",
      "Elantra GDI",
      "Kona ELECTRIC",
    ],
  },
];

// ✅ RUN TESTS
export const runFuzzyMatchTests = () => {
  console.log("🚀 FUZZY MATCHING TESTS - Levenshtein Distance\n");
  console.log("=".repeat(100));

  let totalTests = 0;
  let passedTests = 0;

  testCases.forEach((testCase) => {
    console.log(`\n📍 BRAND: ${testCase.brand}`);
    console.log(`Available Models: ${testCase.availableModels.join(", ")}`);
    console.log("-".repeat(100));

    testCase.apiResponses.forEach((apiResponse) => {
      totalTests++;

      // Očisti model (odstraň varianty)
      let baseModel = apiResponse;

      // ✅ Remove common variant keywords (case-insensitive, but preserve original case)
      const variantKeywords = [
        /\s+BLUETEC\s*/gi,
        /\s+4MATIC\s*/gi,
        /\s+MATIC\s*/gi,
        /\s+AMG\s*/gi,
        /\s+M\s*SPORT\s*/gi,
        /\s+SPORT\s*/gi,
        /\s+EDITION\s*/gi,
        /\s+HYBRID\s*/gi,
        /\s+PLUG-IN\s*/gi,
        /\s+TFSI\s*/gi,
        /\s+TSI\s*/gi,
        /\s+TDI\s*/gi,
        /\s+GDI\s*/gi,
        /\s+CRDI\s*/gi,
        /\s+CVVT\s*/gi,
        /\s+TURBO\s*/gi,
        /\s+SUPERCHARGER\s*/gi,
        /\s+COMFORTLINE\s*/gi,
        /\s+TRENDLINE\s*/gi,
        /\s+HIGHLINE\s*/gi,
        /\s+EDITION.*$/gi,
        /\s+\d+\.\d+L\s*/gi,
        /\s*\(.*\)\s*/g,
      ];

      for (const regex of variantKeywords) {
        baseModel = baseModel.replace(regex, ' ');
      }

      // Clean up multiple spaces - preserve original case
      baseModel = baseModel.replace(/\s+/g, ' ').trim();

      const result = findClosestModel(baseModel, testCase.availableModels);

      // ✅ SUCCESS = similarity >= 0.8 (80%)
      const isSuccess = result.similarity >= 0.8;
      if (isSuccess) passedTests++;

      const statusIcon = isSuccess ? "✅" : "❌";
      const similarityPercent = (result.similarity * 100).toFixed(1);

      console.log(
        `${statusIcon} API: "${apiResponse}" ➜ Cleaned: "${baseModel}"`,
      );
      console.log(
        `   → Match: "${result.model}" | Similarity: ${similarityPercent}% | Distance: ${result.distance}`,
      );
    });
  });

  console.log("\n" + "=".repeat(100));
  console.log(`\n📊 RESULTS: ${passedTests}/${totalTests} PASSED (${((passedTests / totalTests) * 100).toFixed(1)}%)\n`);

  return { totalTests, passedTests };
};

// ✅ Export for testing
export { levenshteinDistance, findClosestModel };