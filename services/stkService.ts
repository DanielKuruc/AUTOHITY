/**
 * STK Service - Kontrola platnosti STK
 * Formát v DB: dd.mm.yyyy
 */

export interface StkStatus {
  isValid: boolean;
  daysRemaining: number;
  message: string;
}

/**
 * Parsování formátu dd.mm.yyyy (s nebo bez mezer)
 */
const parseDateSimple = (dateStr: string): Date | null => {
  if (!dateStr || dateStr.trim() === '') return null;

  // Formát: dd.mm.yyyy (s nebo bez mezer)
  // Přijímá: "24.6.2026", "24. 6. 2026", "8. 8. 2026", atd.
  const match = dateStr.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);
  if (!match) return null;

  const day = parseInt(match[1]);
  const month = parseInt(match[2]);
  const year = parseInt(match[3]);

  // Vytvoř date objekt
  const date = new Date(year, month - 1, day);
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Kontroluje, zda je STK platné
 */
export const checkStkValidity = (stkString: string): StkStatus => {
  if (!stkString || stkString.trim() === '') {
    return {
      isValid: false,
      daysRemaining: 0,
      message: 'STK není vyplněno',
    };
  }

  const stkDate = parseDateSimple(stkString);
  if (!stkDate) {
    return {
      isValid: false,
      daysRemaining: 0,
      message: 'Neplatný formát STK',
    };
  }

  // Dnes
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  stkDate.setHours(0, 0, 0, 0);

  // Jednoduché porovnání: STK je platné pokud stkDate >= today
  const isValid = stkDate.getTime() >= today.getTime();

  return {
    isValid,
    daysRemaining: 0,
    message: isValid ? 'STK je platné' : 'STK vypršelo',
  };
};

/**
 * Vrací informace pro UI - ikonu a barvu
 */
export const getStkIndicator = (stkString: string): {
  icon: 'checkmark-circle' | 'close-circle';
  color: string;
  isValid: boolean;
} | null => {
  // Vrať null pokud je STK prázdné
  if (!stkString || stkString.trim() === '') {
    return null;
  }
  const status = checkStkValidity(stkString);
  return {
    icon: status.isValid ? 'checkmark-circle' : 'close-circle',
    color: status.isValid ? '#34C759' : '#FF3B30',
    isValid: status.isValid,
  };
};