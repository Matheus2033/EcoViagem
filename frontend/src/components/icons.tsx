// Conjunto de ícones em traço (SVG) — herdam a cor via `currentColor` e o
// tamanho via `size`. Substituem os emojis para um visual mais moderno e coeso.
import type { SVGProps } from 'react';

export type IconName =
  | 'dashboard' | 'map-pin' | 'compass' | 'bike' | 'send'
  | 'map' | 'bed' | 'plane' | 'leaf' | 'cloud'
  | 'search' | 'bell' | 'plus' | 'download' | 'arrow-up' | 'arrow-down'
  | 'logout' | 'menu' | 'close' | 'star' | 'check' | 'bolt' | 'trees'
  | 'walk' | 'train' | 'bus' | 'van' | 'car' | 'flag' | 'calc' | 'route' | 'sparkles' | 'globe' | 'coin';

const PATHS: Record<IconName, JSX.Element> = {
  dashboard: (<>
    <rect x="3" y="3" width="7" height="9" rx="1.6" /><rect x="14" y="3" width="7" height="5" rx="1.6" />
    <rect x="14" y="12" width="7" height="9" rx="1.6" /><rect x="3" y="16" width="7" height="5" rx="1.6" />
  </>),
  'map-pin': (<><path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.6" /></>),
  compass: (<><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></>),
  bike: (<><circle cx="6" cy="17" r="3.2" /><circle cx="18" cy="17" r="3.2" /><path d="M6 17 10 8h3l2.5 9M9 8h4" /></>),
  send: (<path d="M3 11.5 21 4l-7.5 17-2.6-6.9L3 11.5Z" />),
  map: (<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14" />),
  bed: (<path d="M3 17v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4M3 17h18M3 17v3m18-3v3M6 11V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3" />),
  plane: (<path d="M3 11.5 21 4l-7.5 17-2.6-6.9L3 11.5Z" />),
  leaf: (<><path d="M12 21c0-6 3.2-10.5 8-12-1 6-4 9.5-8 10.5" /><path d="M12 21C12 14 8 9 4 8c1 6 4 10 8 11" /></>),
  cloud: (<path d="M7 18a4 4 0 0 1 0-8 5.5 5.5 0 0 1 10.6-1.5A3.75 3.75 0 0 1 17.5 18H7Z" />),
  search: (<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></>),
  bell: (<><path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M10.3 21a2 2 0 0 0 3.4 0" /></>),
  plus: (<path d="M12 5v14M5 12h14" />),
  download: (<path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" />),
  'arrow-up': (<path d="M12 19V5m0 0-6 6m6-6 6 6" />),
  'arrow-down': (<path d="M12 5v14m0 0 6-6m-6 6-6-6" />),
  logout: (<><path d="M15 17v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v2" /><path d="M20 12H9m11 0-3.5-3.5M20 12l-3.5 3.5" /></>),
  menu: (<path d="M4 7h16M4 12h16M4 17h16" />),
  close: (<path d="m6 6 12 12M18 6 6 18" />),
  star: (<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z" />),
  check: (<path d="m5 12.5 4.5 4.5L19 7" />),
  bolt: (<path d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z" />),
  trees: (<><path d="M8 3 3.5 10h2L2.5 15H8m0-12 4.5 7h-2L13.5 15H8m0 0v6" /><path d="M16 9l-2.5 4h1.5L13 16h6l-2-3h1.5L16 9Zm0 7v5" /></>),
  walk: (<><circle cx="13" cy="4.5" r="1.6" /><path d="M11 21l1.5-6-2.5-2 .8-4.2L14 10l3 1M8 21l2.5-4" /></>),
  train: (<><rect x="5" y="3" width="14" height="13" rx="3" /><path d="M5 11h14M9 20l-2 2m8-2 2 2" /><circle cx="9" cy="13.5" r="1" /><circle cx="15" cy="13.5" r="1" /></>),
  bus: (<><rect x="4" y="4" width="16" height="13" rx="3" /><path d="M4 11h16M7 21v-2m10 2v-2" /><circle cx="8" cy="14.5" r="1" /><circle cx="16" cy="14.5" r="1" /></>),
  van: (<><path d="M3 15V8a1 1 0 0 1 1-1h9l5 4v4" /><path d="M3 15h18" /><circle cx="7.5" cy="16.5" r="1.8" /><circle cx="16.5" cy="16.5" r="1.8" /></>),
  car: (<><path d="M4 15v-3l2-5h12l2 5v3" /><path d="M3 15h18v2a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1M6 18H5a1 1 0 0 1-1-1v-2" /><circle cx="7.5" cy="14.5" r="1" /><circle cx="16.5" cy="14.5" r="1" /></>),
  flag: (<path d="M5 21V4m0 0 9 1.5L19 4v9l-5 1.5L5 13" />),
  calc: (<><rect x="5" y="3" width="14" height="18" rx="2.5" /><path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 11v6M8 18h4" /></>),
  route: (<><circle cx="6" cy="19" r="2.2" /><circle cx="18" cy="6" r="2.2" /><path d="M8 19h6a4 4 0 0 0 0-8H9a4 4 0 0 1 0-8h3" /></>),
  sparkles: (<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Zm6 10 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13Z" />),
  globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18" /></>),
  coin: (<><circle cx="12" cy="12" r="9" /><path d="M12 16.2c0-3 1.7-5.4 4.2-6.2-.5 3.1-2.1 4.9-4.2 5.4M12 16.2c0-3-1.7-5.4-4.2-6.2.5 3.1 2.1 4.9 4.2 5.4" /></>),
};

export function Icon({
  name, size = 20, strokeWidth = 1.7, ...rest
}: { name: IconName; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

/** Ícone do transporte a partir do nome vindo do banco. */
export function iconeTransporte(nome: string): IconName {
  const n = nome.trim().toLowerCase();
  if (n === 'bicicleta') return 'bike';
  if (n === 'a pé' || n === 'a pe') return 'walk';
  if (n === 'trem') return 'train';
  if (n === 'ônibus' || n === 'onibus') return 'bus';
  if (n === 'van') return 'van';
  if (n === 'carro') return 'car';
  if (n === 'avião' || n === 'aviao') return 'plane';
  return 'route';
}
