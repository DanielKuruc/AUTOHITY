import { useState, useEffect, useCallback } from 'react';
import { 
  fetchVehicleMakes, 
  fetchVehicleModels, 
  fetchAllMakesAndModels,
  Make,
  Model,
} from '@/services/vehicleMakesModelsApi';

interface UseMakesModelsState {
  makes: Make[];
  models: Model[];
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

// Cache pro modely - mapa makeId -> [modely]
const modelsCache = new Map<number, Model[]>();

/**
 * Hook pro správu značek a modelů vozidel
 * Automaticky načítá data z API a cachuje je
 */
export const useMakesModelsApi = () => {
  const [state, setState] = useState<UseMakesModelsState>({
    makes: [],
    models: [],
    isLoading: true,
    error: null,
    isInitialized: false,
  });

  // Počáteční načtení značek
  useEffect(() => {
    const loadMakes = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const data = await fetchAllMakesAndModels();
        if (!data.success || data.error) {
          throw new Error(data.error || 'Chyba při načítání dat');
        }

        // Vyčistíme cache a naplníme nový
        modelsCache.clear();
        data.models.forEach(model => {
          const existing = modelsCache.get(model.makeId) || [];
          modelsCache.set(model.makeId, [...existing, model]);
        });

        setState(prev => ({
          ...prev,
          makes: data.makes,
          models: data.models,
          isLoading: false,
          isInitialized: true,
        }));
      } catch (err: any) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err.message || 'Neznámá chyba',
          isInitialized: false,
        }));
      }
    };

    loadMakes();
  }, []);

  /**
   * Načte modely pro konkrétní značku
   * Používá cache pokud jsou data už dostupná
   */
  const getModelsByMakeId = useCallback((makeId: number | null): Model[] => {
    if (!makeId) return [];
    // Pokud jsou v cache, vrátíme je
    const cached = modelsCache.get(makeId);
    if (cached) {
      return cached.sort((a, b) => a.name.localeCompare(b.name));
    }

    return [];
  }, []);

  /**
   * Najde značku podle jména
   */
  const findMakeByName = useCallback((name: string): Make | undefined => {
    return state.makes.find(make => 
      make.name.toLowerCase() === name.toLowerCase()
    );
  }, [state.makes]);

  /**
   * Najde model podle jména v konkrétní značce
   */
  const findModelByName = useCallback((makeId: number, name: string): Model | undefined => {
    const makeModels = getModelsByMakeId(makeId);
    return makeModels.find(model => 
      model.name.toLowerCase() === name.toLowerCase()
    );
  }, [getModelsByMakeId]);

  /**
   * Vrátí seznam jmen modelů pro significku
   */
  const getModelNamesByMakeId = useCallback((makeId: number | null): string[] => {
    if (!makeId) return [];
    const models = getModelsByMakeId(makeId);
    return models.map(m => m.name);
  }, [getModelsByMakeId]);

  const TOP_MAKE_NAMES = [
    'Audi', 'BMW', 'Citroen', 'Dacia', 'Ford', 'Honda', 'Hyundai',
    'Jeep', 'Kia', 'Land Rover', 'Mercedes-Benz', 'Mini', 'Mitsubishi',
    'Nissan', 'Opel', 'Peugeot', 'Porsche', 'Renault', 'Seat', 'Skoda',
    'Suzuki', 'Škoda', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo',
  ];

  /**
   * Vrátí nejpoužívanější značky seřazené abecedně
   */
  const getTopMakes = useCallback((): Make[] => {
    return state.makes
      .filter(m => TOP_MAKE_NAMES.includes(m.name))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [state.makes]);

  /**
   * Vrátí ostatní značky (mimo top) seřazené abecedně
   */
  const getOtherMakes = useCallback((): Make[] => {
    return state.makes
      .filter(m => !TOP_MAKE_NAMES.includes(m.name))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [state.makes]);
  return {
    makes: state.makes,
    models: state.models,
    isLoading: state.isLoading,
    error: state.error,
    isInitialized: state.isInitialized,
    // Helper funkce
    getModelsByMakeId,
    getModelNamesByMakeId,
    findMakeByName,
    findModelByName,
    getTopMakes,
    getOtherMakes,
  };
};