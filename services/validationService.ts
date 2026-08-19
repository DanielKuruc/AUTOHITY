import { REQUIRED_FIELDS, RequiredFieldKey, getRequiredFieldNamesWithContext } from '@/constants/requiredFields';

/**
 * Validation helpers for purchase forms
 */

export interface ValidationError {
  [key: string]: boolean;
}

export interface ValidationMessages {
  [key: string]: string;
}

export interface PurchaseValidationResult {
  isValid: boolean;
  errors: ValidationError;
  messages: ValidationMessages;
  missingFields: RequiredFieldKey[];
}

/**
 * Validates purchase form against required fields (bez kontextu)
 */
export function validatePurchaseForm(data: Record<string, any>): PurchaseValidationResult {
  return validatePurchaseFormWithContext(data, {});
}

/**
 * Validates purchase form against required fields s KONTEXTEM
 * @param data - data z formuláře
 * @param context - podmínky (np. { registered: true })
 */
export function validatePurchaseFormWithContext(
  data: Record<string, any>,
  context: Record<string, any> = {}
): PurchaseValidationResult {
  const errors: ValidationError = {};
  const messages: ValidationMessages = {};
  const missingFields: RequiredFieldKey[] = [];

  // Ziskej seznam povinných polí s ohledem na kontext
  const requiredFields = getRequiredFieldNamesWithContext(context);

  Object.entries(REQUIRED_FIELDS).forEach(([key, field]) => {
    const fieldKey = key as RequiredFieldKey;
    const value = data[fieldKey];

    // Kontrola zda je pole povinné v TOMTO KONTEXTU
    const isRequiredInContext = requiredFields.includes(fieldKey);

    if (isRequiredInContext) {
      let isEmpty = false;

      switch (field.type) {
        case 'text':
        case 'phone':
        case 'select':
          isEmpty = !value || (typeof value === 'string' && !value.trim());
          break;
        case 'number':
          isEmpty = value === null || value === undefined || value === '' || (typeof value === 'number' && isNaN(value));
          break;
        case 'datetime':
        case 'date':
          isEmpty = !value;
          break;
        case 'image':
          isEmpty = !value || !value.length;
          break;
        case 'boolean':
          isEmpty = value === null || value === undefined;
          break;
      }

      if (isEmpty) {
        errors[fieldKey] = true;
        messages[fieldKey] = `${field.label} je povinné`;
        missingFields.push(fieldKey);
      }
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    messages,
    missingFields,
  };
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