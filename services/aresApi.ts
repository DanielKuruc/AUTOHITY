/**
 * ARES API Service
 * API pro přístup k datům o ekonomických subjektech z ares.gov.cz
 * 
 * Dokumentace: https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty
 * 
 * ARES je veřejně dostupné API bez nutnosti API klíče.
 */

const ARES_API_URL = 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty';

export interface AresCompanyData {
  ico: string;
  nazev: string;
  pravniForma?: string;
  adresa?: string;
  ulice?: string;
  cisloPopisne?: string;
  mesto?: string;
  psc?: string;
  dic?: string;
  datumVzniku?: string;
  success: boolean;
  error?: string;
}

interface AresApiResponse {
  ico: string;
  obchodniJmeno: string;
  pravniForma?: string;
  dic?: string;
  datumVzniku?: string;
  sidlo?: {
    nazevUlice?: string;
    cisloDomovni?: number;
    cisloOrientacni?: number;
    cisloOrientacniPismeno?: string;
    nazevObce?: string;
    nazevMestskeCastiObvodu?: string;
    psc?: number;
    textovaAdresa?: string;
  };
}

/**
 * Validuje formát IČO
 */
export const validateIco = (ico: string): { valid: boolean; message?: string } => {
  if (!ico) {
    return { valid: false, message: 'IČO je povinné' };
  }

  // Odstranit mezery
  const cleanIco = ico.replace(/\s/g, '');

  // IČO musí mít 8 číslic
  if (!/^\d{8}$/.test(cleanIco)) {
    return { valid: false, message: 'IČO musí mít přesně 8 číslic' };
  }

  // Kontrola kontrolního součtu (modulo 11)
  const weights = [8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    sum += parseInt(cleanIco[i]) * weights[i];
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  
  if (parseInt(cleanIco[7]) !== checkDigit) {
    return { valid: false, message: 'Neplatné IČO (chybný kontrolní součet)' };
  }

  return { valid: true };
};

/**
 * Načte data o firmě podle IČO z ARES
 */
export const fetchCompanyByIco = async (ico: string): Promise<AresCompanyData> => {
  // Validace IČO
  const validation = validateIco(ico);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const cleanIco = ico.replace(/\s/g, '');
  const url = `${ARES_API_URL}/${cleanIco}`;

  console.log('[ARES API] Načítám data z:', url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.status === 404) {
      throw new Error('Firma s tímto IČO nebyla nalezena v registru ARES');
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ARES API] Chyba:', response.status, errorText);
      throw new Error(`Chyba při načítání dat: ${response.status}`);
    }

    const data: AresApiResponse = await response.json();
    console.log('[ARES API] Přijata data:', data);

    return mapAresResponse(data);
  } catch (error: any) {
    console.error('[ARES API] Chyba při načítání:', error);
    
    // Pokud je to NetworkError, může to být CORS problém
    if (error.message === 'Network request failed') {
      throw new Error('Nepodařilo se připojit k ARES. Zkontrolujte připojení k internetu.');
    }
    
    throw error;
  }
};

/**
 * Mapuje odpověď z ARES API na náš interface
 */
const mapAresResponse = (data: AresApiResponse): AresCompanyData => {
  const sidlo = data.sidlo;
  
  // Sestavení adresy
  let ulice = '';
  if (sidlo?.nazevUlice) {
    ulice = sidlo.nazevUlice;
    if (sidlo.cisloDomovni) {
      ulice += ` ${sidlo.cisloDomovni}`;
      if (sidlo.cisloOrientacni) {
        ulice += `/${sidlo.cisloOrientacni}${sidlo.cisloOrientacniPismeno || ''}`;
      }
    }
  }

  // Formátování PSČ
  let psc = '';
  if (sidlo?.psc) {
    const pscStr = sidlo.psc.toString();
    psc = pscStr.length === 5 ? `${pscStr.slice(0, 3)} ${pscStr.slice(3)}` : pscStr;
  }

  // Formátování data vzniku
  let datumVzniku = '';
  if (data.datumVzniku) {
    const date = new Date(data.datumVzniku);
    if (!isNaN(date.getTime())) {
      datumVzniku = date.toLocaleDateString('cs-CZ');
    }
  }

  return {
    ico: data.ico,
    nazev: data.obchodniJmeno,
    pravniForma: data.pravniForma,
    adresa: sidlo?.textovaAdresa,
    ulice,
    cisloPopisne: sidlo?.cisloDomovni?.toString(),
    mesto: sidlo?.nazevObce || sidlo?.nazevMestskeCastiObvodu,
    psc,
    dic: data.dic,
    datumVzniku,
    success: true,
  };
};

/**
 * Vyhledá firmy podle názvu (max 100 výsledků)
 */
export const searchCompaniesByName = async (name: string, limit: number = 10): Promise<AresCompanyData[]> => {
  if (!name || name.length < 3) {
    throw new Error('Zadejte alespoň 3 znaky pro vyhledávání');
  }

  const url = `${ARES_API_URL}?obchodniJmeno=${encodeURIComponent(name)}&start=0&pocet=${limit}`;

  console.log('[ARES API] Vyhledávám:', url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Chyba při vyhledávání: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.ekonomickeSubjekty || data.ekonomickeSubjekty.length === 0) {
      return [];
    }

    return data.ekonomickeSubjekty.map((item: any) => ({
      ico: item.ico,
      nazev: item.obchodniJmeno,
      mesto: item.sidlo?.nazevObce,
      success: true,
    }));
  } catch (error: any) {
    console.error('[ARES API] Chyba při vyhledávání:', error);
    throw error;
  }
};
