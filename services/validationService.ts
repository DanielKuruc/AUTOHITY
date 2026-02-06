/**
 * Validation helpers for purchase forms
 */

export interface ValidationError {
  [key: string]: boolean;
}

export interface ValidationMessages {
  [key: string]: string;
}

/**
 * Validates zakladni (basic) tab fields
 */
export function validateZakladniTab(data: {
  firma: boolean;
  jmeno?: string;
  prijmeni?: string;
  nazevFirmy?: string;
  telefon?: string;
}): { errors: ValidationError; messages: ValidationMessages } {
  const errors: ValidationError = {};
  const messages: ValidationMessages = {};

  if (data.firma) {
    // Company validation
    if (!data.nazevFirmy?.trim()) {
      errors.nazevFirmy = true;
      messages.nazevFirmy = 'Název firmy je povinný';
    }
  } else {
    // Personal validation
    if (!data.jmeno?.trim()) {
      errors.jmeno = true;
      messages.jmeno = 'Jméno je povinné';
    }
    if (!data.prijmeni?.trim()) {
      errors.prijmeni = true;
      messages.prijmeni = 'Příjmení je povinné';
    }
  }

  if (!data.telefon?.trim()) {
    errors.telefon = true;
    messages.telefon = 'Telefon je povinný';
  }

  return { errors, messages };
}

/**
 * Validates automobil (vehicle) tab fields
 */
export function validateAutomobilTab(data: {
  znacka?: string;
  model?: string;
  spz?: string;
  km?: string;
}): { errors: ValidationError; messages: ValidationMessages } {
  const errors: ValidationError = {};
  const messages: ValidationMessages = {};

  if (!data.znacka?.trim() || data.znacka === '---Výběr---') {
    errors.znacka = true;
    messages.znacka = 'Značka vozidla je povinná';
  }

  if (!data.model?.trim() || data.model === '---Výběr---') {
    errors.model = true;
    messages.model = 'Model vozidla je povinný';
  }

  if (!data.spz?.trim()) {
    errors.spz = true;
    messages.spz = 'SPZ je povinná';
  }

  if (!data.km?.trim()) {
    errors.km = true;
    messages.km = 'Kilometry jsou povinné';
  }

  return { errors, messages };
}

/**
 * Validates souhrn (summary) tab fields
 */
export function validateSouhrnTab(data: {
  vin?: string;
  cenaVykupu?: string;
}): { errors: ValidationError; messages: ValidationMessages } {
  const errors: ValidationError = {};
  const messages: ValidationMessages = {};

  if (!data.vin?.trim()) {
    errors.vin = true;
    messages.vin = 'VIN je povinný';
  }

  if (!data.cenaVykupu?.trim()) {
    errors.cenaVykupu = true;
    messages.cenaVykupu = 'Cena výkupu je povinná';
  }

  return { errors, messages };
}

/**
 * Validates all tabs and returns combined errors
 */
export function validateAllTabs(
  zakladniData: any,
  automobilData: any,
  souhrnData: any
): { errors: ValidationError; messages: ValidationMessages } {
  const zakladniValidation = validateZakladniTab(zakladniData);
  const automobilValidation = validateAutomobilTab(automobilData);
  const souhrnValidation = validateSouhrnTab(souhrnData);

  return {
    errors: {
      ...zakladniValidation.errors,
      ...automobilValidation.errors,
      ...souhrnValidation.errors,
    },
    messages: {
      ...zakladniValidation.messages,
      ...automobilValidation.messages,
      ...souhrnValidation.messages,
    },
  };
}
