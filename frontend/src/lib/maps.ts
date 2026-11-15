// Integração opcional com o Google Maps. A chave vem de uma variável de build
// (VITE_GOOGLE_MAPS_API_KEY). Sem chave, o app usa distância em linha reta
// (haversine) entre as coordenadas dos destinos como estimativa.

export const MAPS_KEY: string = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ?? '';
export const hasMaps = () => MAPS_KEY.trim().length > 0;

let carregando: Promise<any> | null = null;

/** Carrega o script do Google Maps JS uma única vez. Rejeita se não houver chave. */
export function loadGoogleMaps(): Promise<any> {
  if (!hasMaps()) return Promise.reject(new Error('Chave do Google Maps não configurada'));
  const w = window as any;
  if (w.google?.maps) return Promise.resolve(w.google);
  if (carregando) return carregando;

  carregando = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(MAPS_KEY)}&libraries=places&language=pt-BR&region=BR`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve((window as any).google);
    s.onerror = () => {
      carregando = null;
      reject(new Error('Falha ao carregar o Google Maps (verifique a chave e o billing)'));
    };
    document.head.appendChild(s);
  });
  return carregando;
}

export interface Coord { lat: number; lng: number; }

export interface Sugestao { id: string; descricao: string; }

/** Autocomplete de lugares do Google (qualquer endereço/cidade). Vazio sem chave. */
export async function buscarSugestoes(input: string): Promise<Sugestao[]> {
  if (!hasMaps() || input.trim().length < 3) return [];
  try {
    const google = await loadGoogleMaps();
    const svc = new google.maps.places.AutocompleteService();
    return await new Promise((resolve) => {
      svc.getPlacePredictions(
        { input, componentRestrictions: { country: 'br' } },
        (preds: any, status: string) => {
          if (status !== 'OK' || !preds) return resolve([]);
          resolve(preds.map((p: any) => ({ id: p.place_id, descricao: p.description })));
        },
      );
    });
  } catch {
    return [];
  }
}

/** Resolve as coordenadas de um place_id do Google. */
export async function coordsDoPlace(placeId: string): Promise<Coord | null> {
  if (!hasMaps()) return null;
  try {
    const google = await loadGoogleMaps();
    const svc = new google.maps.places.PlacesService(document.createElement('div'));
    return await new Promise((resolve) => {
      svc.getDetails({ placeId, fields: ['geometry'] }, (place: any, status: string) => {
        if (status !== 'OK' || !place?.geometry?.location) return resolve(null);
        resolve({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
      });
    });
  } catch {
    return null;
  }
}

/** Distância em linha reta (km) entre duas coordenadas — fórmula de haversine. */
export function haversineKm(a: Coord, b: Coord): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
