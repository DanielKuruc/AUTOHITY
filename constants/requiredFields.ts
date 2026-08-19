/**
 * SEZNAM POVINNÝCH POLÍ PRO VÝKUPY
 * Tato definice se používá pro validaci ve formulářích new-purchase a edit-purchase
 * 
 * POZOR: Některá pole jsou PODMÍNĚNÁ na základě toggle "Registrováno"
 * - Pokud registered = true: SPZ, STK jsou POVINNÁ
 * - Pokud registered = false: SPZ, STK jsou SKRYTÁ a VOLITELNÁ
 */

export const REQUIRED_FIELDS = {
  // FOTO
  coverPhoto: {
    label: 'Úvodní fotka vozidla',
    required: true,
    type: 'image',
    dependsOn: undefined,
  },

  // ZÁKLADNÍ INFORMACE
  inspectionDate: {
    label: 'Datum prohlídky',
    required: true,
    type: 'datetime',
    dependsOn: undefined,
  },

  // VOZIDLO
  make: {
    label: 'Značka',
    required: true,
    type: 'select',
    dependsOn: undefined,
  },
  model: {
    label: 'Model',
    required: true,
    type: 'select',
    dependsOn: undefined,
  },
  motorovaVarianta: {
    label: 'Motorová varianta',
    required: true,
    type: 'select',
    dependsOn: undefined,
  },
  transmission: {
    label: 'Převodovka',
    required: true,
    type: 'select',
    dependsOn: undefined,
  },
  drivetrain: {
    label: 'Pohon',
    required: true,
    type: 'select',
    dependsOn: undefined,
  },
  spz: {
    label: 'SPZ',
    required: true,
    type: 'text',
    dependsOn: 'registered', // 🔴 Povinné POUZE když registered=true
  },

  // CENA
  totalAmount: {
    label: 'Výkupní cena',
    required: false,
    type: 'number',
    dependsOn: undefined,
  },

  // KLIENT
  clientName: {
    label: 'Jméno klienta',
    required: true,
    type: 'text',
    dependsOn: undefined,
  },
  clientPhone: {
    label: 'Telefon klienta',
    required: true,
    type: 'phone',
    dependsOn: undefined,
  },

  // DOPLŇUJÍCÍ INFORMACE (OPTIONAL)
  description: {
    label: 'Popis stavu vozidla',
    required: false,
    type: 'text',
    dependsOn: undefined,
  },
  purchaseDate: {
    label: 'Datum výkupu',
    required: false,
    type: 'date',
    dependsOn: undefined,
  },
  stk: {
    label: 'STK',
    required: true,
    type: 'date',
    dependsOn: 'registered', // 🔴 Povinné POUZE když registered=true
  },
  vin: {
    label: 'VIN',
    required: true,
    type: 'text',
    dependsOn: undefined,
  },
  mileage: {
    label: 'Kilometry',
    required: false,
    type: 'number',
    dependsOn: undefined,
  },
  pocetVlastniku: {
    label: 'Počet vlastníků',
    required: false,
    type: 'number',
    dependsOn: 'registered', // 🔴 Skryté když registered=false
  },
  pocetProvozovatelu: {
    label: 'Počet provozovatelů',
    required: false,
    type: 'number',
    dependsOn: 'registered', // 🔴 Skryté když registered=false
  },
  prvniMajitel: {
    label: 'První majitel',
    required: false,
    type: 'boolean',
    dependsOn: 'registered', // 🔴 Skryté když registered=false
  },
} as const;

export type RequiredFieldKey = keyof typeof REQUIRED_FIELDS;

/**
 * Vrací seznam všech povinných polí NEZÁVISLE NA KONTEXTU
 */
export const getRequiredFieldNames = (): RequiredFieldKey[] => {
  return Object.entries(REQUIRED_FIELDS)
    .filter(([, field]) => field.required && !field.dependsOn)
    .map(([key]) => key as RequiredFieldKey);
};

/**
 * Vrací seznam všech povinných polí NA ZÁKLADĚ PODMÍNEK
 * @param context - objekt s podmínkami (např. { registered: true })
 */
export const getRequiredFieldNamesWithContext = (context: Record<string, any>): RequiredFieldKey[] => {
  return Object.entries(REQUIRED_FIELDS)
    .filter(([, field]) => {
      if (!field.required) return false;
      if (!field.dependsOn) return true;
      return context[field.dependsOn] === true;
    })
    .map(([key]) => key as RequiredFieldKey);
};

/**
 * Vrací seznam všech volitelných polí
 */
export const getOptionalFieldNames = (): RequiredFieldKey[] => {
  return Object.entries(REQUIRED_FIELDS)
    .filter(([, field]) => !field.required)
    .map(([key]) => key as RequiredFieldKey);
};

/**
 * Vrací povinná pole seskupená podle typu
 */
export const getRequiredFieldsByType = () => {
  const grouped: Record<string, RequiredFieldKey[]> = {};

  Object.entries(REQUIRED_FIELDS)
    .filter(([, field]) => field.required && !field.dependsOn)
    .forEach(([key, field]) => {
      const type = field.type;
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(key as RequiredFieldKey);
    });

  return grouped;
};

/**
 * Vrací která pole závisí na "registered" toggle
 */
export const getRegistrationDependentFields = (): RequiredFieldKey[] => {
  return Object.entries(REQUIRED_FIELDS)
    .filter(([, field]) => field.dependsOn === 'registered')
    .map(([key]) => key as RequiredFieldKey);
};

/**
 * Vrací povinná pole seskupená podle sekce formuláře
 */
export const REQUIRED_FIELDS_BY_SECTION = {
  photo: ['coverPhoto'] as RequiredFieldKey[],
  basicInfo: ['inspectionDate', 'clientName', 'clientPhone'] as RequiredFieldKey[],
  vehicle: ['make', 'model', 'motorovaVarianta', 'transmission', 'drivetrain', 'spz'] as RequiredFieldKey[],
  price: [] as RequiredFieldKey[],
} as const;