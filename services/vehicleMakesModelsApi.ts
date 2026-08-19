/**
 * Vehicle Makes and Models API Service
 * API pro přístup k datům o značkách a modelech vozidel
 * Používá stejnou URL strukturu jako apiService.ts
 */

import { getAuthHeaders } from './apiService';

const PHP_BASE = process.env.EXPO_PUBLIC_PHP_API_BASE || 'https://autohity.cz';
const API_BASE_URL = `${PHP_BASE}/php-api`;

export interface Make {
  id: number;
  name: string;
}

export interface Model {
  id: number;
  makeId: number;
  name: string;
  series?: string | null;
}

export interface MakesModelsResponse {
  makes: Make[];
  models: Model[];
  success: boolean;
  error?: string;
}

/**
 * Načte seznam všech značek vozidel
 */
export const fetchVehicleMakes = async (): Promise<Make[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/vehicle/makes`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API chyba: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Neočekávaný formát odpovědi');
    }

    return data.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error: any) {
    throw new Error(`Nepodařilo se načíst značky vozidel: ${error.message}`);
  }
};

/**
 * Načte seznam modelů pro konkrétní značku
 */
export const fetchVehicleModels = async (makeName: string): Promise<Model[]> => {
  if (!makeName || makeName.trim() === '') {
    throw new Error('Neplatný název značky');
  }

  try {
    const encodedMakeName = encodeURIComponent(makeName);
    const response = await fetch(`${API_BASE_URL}/vehicle/makes/${encodedMakeName}/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API chyba: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Neočekávaný formát odpovědi');
    }

    return data.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error: any) {
    throw new Error(`Nepodařilo se načíst modely: ${error.message}`);
  }
};

/**
 * Načte všechny značky a modely najednou
 */
export const fetchAllMakesAndModels = async (): Promise<MakesModelsResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/vehicle/makes-models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API chyba: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.makes || !Array.isArray(data.makes) || !data.models || !Array.isArray(data.models)) {
      throw new Error('Neočekávaný formát odpovědi');
    }

    return {
      makes: data.makes.sort((a: Make, b: Make) => a.name.localeCompare(b.name)),
      models: data.models,
      success: true,
    };
  } catch (error: any) {
    return {
      makes: [],
      models: [],
      success: false,
      error: `Nepodařilo se načíst data: ${error.message}`,
    };
  }
};

export interface MutateResult {
  success: boolean;
  error?: string;
}

/**
 * Admin operace nad číselníkem značek/modelů.
 * Vyžadují přihlášeného uživatele s isAdmin - endpointy na php-api to ověřují
 * přes Auth::requireAdmin(), takže se sem musí propsat skutečný Bearer token
 * (viz setGlobalJwtToken v apiService.ts, volané z AuthContext).
 */
export const createMake = async (name: string, isTop = false): Promise<MutateResult & { id?: number }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/vehicle/make`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, isTop }),
    });
    const data = await response.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const updateMake = async (id: number, name: string, isTop = false): Promise<MutateResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/vehicle/make/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, isTop }),
    });
    const data = await response.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const deleteMake = async (id: number): Promise<MutateResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/vehicle/make/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const createModel = async (makeId: number, name: string, series?: string): Promise<MutateResult & { id?: number }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/vehicle/model`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ makeId, name, series: series || null }),
    });
    const data = await response.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const updateModel = async (id: number, name: string, series?: string): Promise<MutateResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/vehicle/model/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, series: series || null }),
    });
    const data = await response.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const deleteModel = async (id: number): Promise<MutateResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/vehicle/model/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};