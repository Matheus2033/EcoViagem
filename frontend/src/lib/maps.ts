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
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(MAPS_KEY)}&language=pt-BR&region=BR`;
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
