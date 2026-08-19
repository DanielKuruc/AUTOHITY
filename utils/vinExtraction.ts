/**
 * Extrakce VIN z textu vráceného OCR.
 * VIN má 17 znaků a nikdy neobsahuje I, O ani Q (ISO 3779).
 */

const VIN_LENGTH = 17;
const VIN_CHARS = /^[A-HJ-NPR-Z0-9]{17}$/;
const VIN_PATTERN = /[A-HJ-NPR-Z0-9]{17}/g;

/**
 * OCR běžně plete znaky, které se ve VIN nemohou vyskytovat, s číslicemi.
 * Nahrazujeme jen I, O a Q - ty ve VIN nikdy nejsou, takže je záměna bezpečná.
 * POZOR: L, S ani B se nahrazovat nesmí, jsou to platné znaky VIN.
 */
function normalizeOcrConfusions(text: string): string {
  return text
    .toUpperCase()
    .replace(/I/g, '1')
    .replace(/[OQ]/g, '0')
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Kontrolní číslice na 9. pozici podle ISO 3779.
 * Povinná je v Severní Americe; evropská vozidla ji často nemají validní,
 * proto slouží jen jako preference při více kandidátech, ne jako filtr.
 */
export function hasValidCheckDigit(vin: string): boolean {
  if (!VIN_CHARS.test(vin)) return false;

  const translit: Record<string, number> = {
    A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
    J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
    S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  };
  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < VIN_LENGTH; i++) {
    const char = vin[i];
    const value = /[0-9]/.test(char) ? Number(char) : translit[char];
    if (value === undefined) return false;
    sum += value * weights[i];
  }

  const remainder = sum % 11;
  const expected = remainder === 10 ? 'X' : String(remainder);
  return vin[8] === expected;
}

/** Vybere nejlepšího kandidáta - přednost má VIN s platnou kontrolní číslicí */
function pickBest(candidates: string[]): string | null {
  if (candidates.length === 0) return null;
  return candidates.find(hasValidCheckDigit) ?? candidates[0];
}

/**
 * Najde VIN v jednom řetězci (bez normalizace znaků).
 */
function findRawCandidates(text: string): string[] {
  const matches = text.replace(/\s+/g, '').toUpperCase().match(VIN_PATTERN);
  return matches ?? [];
}

/**
 * Extrahuje VIN z OCR výstupu.
 *
 * Přijímá buď jeden řetězec, nebo pole řádků (což vrací expo-text-extractor).
 * Řádky se prohledávají nejdřív jednotlivě - VIN je na štítku obvykle na
 * vlastním řádku a spojování celého textu může vytvořit falešnou shodu
 * ze dvou nesouvisejících čísel.
 */
export function extractVINFromText(input: string | string[] | null | undefined): string | null {
  if (!input) return null;
  const lines = Array.isArray(input) ? input : [input];
  if (lines.length === 0) return null;

  // 1) Přesná shoda po řádcích
  const perLine = lines.flatMap(findRawCandidates);
  const exact = pickBest(perLine);
  if (exact) return exact;

  // 2) Po řádcích s opravou záměn znaků (O->0, I->1, ...)
  const perLineNormalized = lines.flatMap((line) => {
    const normalized = normalizeOcrConfusions(line);
    return normalized.length >= VIN_LENGTH ? findRawCandidates(normalized) : [];
  });
  const normalized = pickBest(perLineNormalized);
  if (normalized) return normalized;

  // 3) VIN zalomený přes konec řádku - spojujeme jen SOUSEDNÍ řádky.
  // Spojení všech řádků dohromady by z nesouvisejících čísel a slov
  // (např. "Skoda Octavia" + "2015") složilo falešný 17znakový kandidát.
  const pairs: string[] = [];
  for (let i = 0; i < lines.length - 1; i++) {
    pairs.push(normalizeOcrConfusions(lines[i] + lines[i + 1]));
  }
  return pickBest(pairs.flatMap(findRawCandidates));
}

/**
 * Ověří formát VIN (17 znaků, bez I/O/Q). Kontrolní číslici záměrně
 * neověřuje - evropská vozidla ji často nemají platnou.
 */
export function isValidVIN(vin: string): boolean {
  if (!vin) return false;
  return VIN_CHARS.test(vin.toUpperCase());
}

/**
 * Očistí VIN zadaný uživatelem. I/O/Q převede na 1/0/0 místo toho, aby je
 * zahodila - ze štítku se často opisuje "O" tam, kde je nula, a tiché smazání
 * znaku by vedlo na 16 znaků a nejasnou chybu.
 */
export function normalizeVinInput(input: string): string {
  return normalizeOcrConfusions(input);
}
