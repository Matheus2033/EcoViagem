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

/* ---------------------------------------------------------------------------
 * Alternativa GRATUITA ao Google Maps (não precisa de chave nem billing):
 * - Geocodificação de endereços reais via OpenStreetMap / Nominatim.
 * - Distância rodoviária real via OSRM (router.project-osrm.org).
 * Usadas quando VITE_GOOGLE_MAPS_API_KEY não está configurada, para que o app
 * ainda aceite endereços específicos (ex.: "Higienópolis 1588") e calcule a
 * distância de verdade, em vez de só linha reta.
 * ------------------------------------------------------------------------- */

export interface SugestaoGeo { descricao: string; lat: number; lng: number; }

/**
 * Autocomplete de endereços reais via OpenStreetMap/Nominatim (grátis, sem chave).
 * Já retorna as coordenadas junto, dispensando uma segunda consulta.
 */
export async function buscarSugestoesOSM(input: string): Promise<SugestaoGeo[]> {
  const q = input.trim();
  if (q.length < 3) return [];
  try {
    const url =
      'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=0&limit=6&countrycodes=br&q=' +
      encodeURIComponent(q);
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const arr = await res.json();
    return (Array.isArray(arr) ? arr : [])
      .map((n: any) => ({ descricao: String(n.display_name ?? ''), lat: Number(n.lat), lng: Number(n.lon) }))
      .filter((s: SugestaoGeo) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
  } catch {
    return [];
  }
}

/**
 * Distância rodoviária real (km) entre dois pontos via OSRM (grátis, sem chave).
 * Retorna null quando não há rota por estrada (ex.: ilha, travessia aérea).
 */
export async function rotaRodoviariaKm(a: Coord, b: Coord): Promise<number | null> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}` +
      '?overview=false&alternatives=false';
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.code !== 'Ok' || !Array.isArray(data.routes) || data.routes.length === 0) return null;
    const metros = data.routes[0]?.distance;
    return typeof metros === 'number' && metros >= 0 ? metros / 1000 : null;
  } catch {
    return null;
  }
}
