import Constants from 'expo-constants';

const BASE_URL = 'https://app.base44.com/api/apps/6902a838fd2d04abb76906c2/entities/Car';

export type Base44Car = {
  id: string;
  make?: string;
  model?: string;
  variant?: string;
  price?: number | null;
  mileage?: number | null;
};

export async function fetchBase44Cars(q: string = ''): Promise<Base44Car[]> {
  const apiKey = (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_BASE44_API_KEY || process.env.EXPO_PUBLIC_BASE44_API_KEY;
  if (!apiKey) {
    throw new Error('Missing EXPO_PUBLIC_BASE44_API_KEY');
  }
  const resp = await fetch(BASE_URL, {
    headers: {
      'api_key': apiKey as string,
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Base44 error ${resp.status}: ${t}`);
  }
  const data = await resp.json();
  const list: any[] = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
  const simplified: Base44Car[] = list.map((it: any) => ({
    id: it.id || it.public_id || it.custom_id,
    make: it.make,
    model: it.model,
    variant: it.variant || it.engine_volume || it.power,
    price: it.price ?? it.original_price ?? null,
    mileage: it.mileage ?? null,
  }));
  const filtered = q ? simplified.filter((c) => (`${c.make} ${c.model} ${c.variant}`.toLowerCase().includes(q.toLowerCase()))) : simplified;
  return filtered.slice(0, 100);
}
