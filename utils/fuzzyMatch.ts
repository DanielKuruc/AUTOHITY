/**
 * FUZZY MATCHING - Levenshtein Distance
 * Matchuje API modely s dostupnými modely bez "očesávání"
 * Vrací vždy model ze číslenníku!
 */

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
        editDistances[j - 1] + (longer[i - 1] === shorter[j - 1] ? 0 : 1),
      );
    }
    editDistances = editDistance;
  }
  return editDistances[shorter.length];
};

const tokenize = (s: string): string[] =>
  s
    .toLowerCase()
    .split(/[\s\-_/]+/)
    .filter((t) => t.length > 0);

/**
 * Zjistí, jestli se `needle` vyskytuje v `haystack` jako souvislá posloupnost tokenů
 * (poslední token smí být jen prefixem odpovídajícího tokenu - řeší "Golf7" bez mezery).
 * Na rozdíl od hrubého porovnání znaků nedovolí, aby např. "S 450" "matchlo" uvnitř
 * "GLS 450" jen proto, že "S" je koncové písmeno slova "GLS".
 */
const tokenSequenceContains = (needle: string[], haystack: string[]): boolean => {
  if (needle.length === 0 || haystack.length < needle.length) return false;
  for (let start = 0; start <= haystack.length - needle.length; start++) {
    let ok = true;
    for (let i = 0; i < needle.length; i++) {
      const h = haystack[start + i];
      const isLast = i === needle.length - 1;
      const matches = isLast ? (h === needle[i] || h.startsWith(needle[i])) : h === needle[i];
      if (!matches) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
};

// Engine/trim/drivetrain/body words that show up in the vehicle registry's free-text
// "commercial designation" but never appear as catalog model names on their own.
// Stripping them gives the matcher a second, cleaner shot when the raw string fails.
const NOISE_KEYWORDS = [
  'BLUETEC', '4MATIC', 'MATIC', 'AMG', 'M SPORT', 'SPORT', 'EDITION', 'HYBRID',
  'PLUG-IN', 'PLUGIN', 'TFSI', 'TSI', 'TDI', 'GDI', 'CRDI', 'CVVT', 'TURBO',
  'SUPERCHARGER', 'COMFORTLINE', 'TRENDLINE', 'HIGHLINE', 'QUATTRO', 'XDRIVE',
  'ECOBOOST', 'TDCI', 'DCI', 'HDI', 'VTEC', 'DIESEL', 'BENZIN', 'BENZÍN', 'NAFTA',
  'ELECTRIC', '4X4', '4WD', 'AWD', 'FWD', 'RWD',
];

const cleanModelNoise = (s: string): string => {
  let out = s;
  for (const kw of NOISE_KEYWORDS) {
    out = out.replace(new RegExp(`\\b${kw}\\b`, 'gi'), ' ');
  }
  // Engine displacement like "2.0", "1.6L"
  out = out.replace(/\b\d+[.,]\d\s*L?\b/gi, ' ');
  // Trailing/embedded parenthetical notes
  out = out.replace(/\(.*?\)/g, ' ');
  return out.replace(/\s+/g, ' ').trim();
};

/**
 * Zkusí exact/token/substring/fuzzy match jedné konkrétní varianty vstupního řetězce.
 * Vrací null, pokud žádný krok neuspěje (fuzzy-krok respektuje práh 0.7).
 */
const matchOnce = (apiModel: string, validModels: string[]): string | null => {
  const apiLower = apiModel.toLowerCase().trim();
  if (!apiLower) return null;

  // STEP 1: Exact match (case-insensitive)?
  const exactMatch = validModels.find((m) => m.toLowerCase() === apiLower);
  if (exactMatch) {
    return exactMatch;
  }

  // STEP 2: Token/word-based match - všechna slova modelu musí být v API stringu
  // Řeší např. "OCTAVIA 2.0 TDI 4x4 SCOUT" → "Octavia Scout" (preferuje delší/specifičtější match)
  const apiTokens = tokenize(apiLower);
  let tokenMatch: string | null = null;
  let bestTokenScore = 0;
  for (const model of validModels) {
    const modelTokens = tokenize(model);
    if (modelTokens.length === 0) continue;
    const allMatch = modelTokens.every((mt) => apiTokens.includes(mt));
    if (allMatch) {
      const score = modelTokens.reduce((acc, t) => acc + t.length, 0);
      if (score > bestTokenScore) {
        bestTokenScore = score;
        tokenMatch = model;
      }
    }
  }
  if (tokenMatch) {
    return tokenMatch;
  }

  // STEP 3: Substring match (na hranicích tokenů) - fallback pro modely, kde
  // tokenizace v kroku 2 selže (např. "Golf7" bez mezery, nebo krátký API
  // string obsažený v delším modelu). Musí respektovat hranice slov, jinak by
  // např. "S 450" "matchlo" uvnitř "GLS 450" jen díky shodě posledních znaků.
  // ✅ PREFER LONGER MATCHES (e.g., "GLS" over "G")
  let substringMatch: string | null = null;
  let longestMatchLength = 0;
  for (const model of validModels) {
    const modelLower = model.toLowerCase();
    const modelTokens = tokenize(modelLower);
    if (modelTokens.length === 0) continue;

    if (tokenSequenceContains(modelTokens, apiTokens) && modelLower.length > longestMatchLength) {
      substringMatch = model;
      longestMatchLength = modelLower.length;
    } else if (tokenSequenceContains(apiTokens, modelTokens) && apiLower.length > longestMatchLength) {
      substringMatch = model;
      longestMatchLength = apiLower.length;
    }
  }

  if (substringMatch) {
    return substringMatch;
  }

  // STEP 4: Fuzzy match with similarity threshold - vrátit nejpodobnější dostupný model
  // Při shodné podobnosti preferuj kandidáta, jehož první token (řada modelu, např.
  // "GLS" vs "GL" vs "S") přesně souhlasí s prvním tokenem API stringu - zabraňuje
  // matchi na jinou modelovou řadu jen kvůli chybějící variantě výkonu v číselníku.
  let closest: string | null = null;
  let closestFamilyMatch = false;
  let maxSimilarity = 0;
  const apiFirstToken = apiTokens[0];

  for (const model of validModels) {
    const modelLower = model.toLowerCase();
    const distance = levenshteinDistance(apiLower, modelLower);
    const maxLen = Math.max(apiLower.length, model.length);
    const similarity = 1 - distance / maxLen;
    const isFamilyMatch = !!apiFirstToken && tokenize(modelLower)[0] === apiFirstToken;

    if (
      similarity > maxSimilarity ||
      (similarity === maxSimilarity && isFamilyMatch && !closestFamilyMatch)
    ) {
      maxSimilarity = similarity;
      closest = model;
      closestFamilyMatch = isFamilyMatch;
    }
  }

  // ✅ CRITICAL: Only return fuzzy match if similarity is HIGH (>= 0.7)
  // This prevents GLE 450 from matching GLA 45 (similarity would be ~0.5)
  if (closest && maxSimilarity >= 0.7) {
    return closest;
  }

  return null;
};

/**
 * Matchuje API model s dostupnými modely
 * @param apiModel - Model z API (např. "GL 350 BLUETEC 4MATIC")
 * @param availableModels - Seznam dostupných modelů z číslenníku
 * @returns Model ze číslenníku který se nejlépe matchne
 */
export const findClosestModel = (
  apiModel: string,
  availableModels: string[],
): string => {
  if (!apiModel || availableModels.length === 0) {
    return "---Výběr---";
  }

  const validModels = availableModels.filter((m) => m !== "---Výběr---");
  if (validModels.length === 0) {
    return "---Výběr---";
  }

  // Try the raw string first (preserves precision if a model name genuinely
  // contains one of the noise keywords, e.g. a trim actually called "Turbo").
  const rawMatch = matchOnce(apiModel, validModels);
  if (rawMatch) {
    return rawMatch;
  }

  // Registry "commercial designation" strings are often padded with engine/trim/
  // drivetrain words the catalog doesn't have (e.g. "TUCSON 1.6 CRDI 4X4") - retry
  // against a cleaned-up version before giving up.
  const cleaned = cleanModelNoise(apiModel);
  if (cleaned && cleaned.toLowerCase() !== apiModel.toLowerCase().trim()) {
    const cleanedMatch = matchOnce(cleaned, validModels);
    if (cleanedMatch) {
      return cleanedMatch;
    }
  }

  // Fallback - žádný dostatečně dobrý match, nenutit výběr
  return '---Výběr---';
};