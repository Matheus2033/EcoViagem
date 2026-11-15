import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';
import type { TipoTransporte } from '../types';
import { Card, PageTitle, Loader, ErroBox, Page } from '../components';
import { fadeUp } from '../lib/motion';
import { useAsync } from '../hooks/useAsync';
import {
  hasMaps, loadGoogleMaps, haversineKm, buscarSugestoes, coordsDoPlace, type Coord,
} from '../lib/maps';
import { CIDADES_BR } from '../lib/placesBR';

const ICONE: Record<string, string> = {
  'bicicleta': '🚲', 'a pé': '🚶', 'trem': '🚆', 'ônibus': '🚌',
  'onibus': '🚌', 'van': '🚐', 'carro': '🚗', 'avião': '✈️', 'aviao': '✈️',
};
const iconeDe = (n: string) => ICONE[n.trim().toLowerCase()] ?? '🚏';
const corFator = (f: number) => (f <= 0 ? '#059669' : f < 0.07 ? '#65a30d' : f < 0.15 ? '#d97706' : '#dc2626');
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface Place { nome: string; sub?: string; lat: number; lng: number; tipo: 'destino' | 'cidade' | 'google'; }

export default function Rotas() {
  const { data, loading, erro } = useAsync(async () => {
    const [destinos, transportes] = await Promise.all([api.destinos(), api.tiposTransporte()]);
    return { destinos, transportes };
  });

  const [origem, setOrigem] = useState<Place | null>(null);
  const [destino, setDestino] = useState<Place | null>(null);
  const [distancia, setDistancia] = useState<number | null>(null);
  const [fonte, setFonte] = useState<'google' | 'reta'>('reta');
  const [calc, setCalc] = useState(false);
  const [avisoMapa, setAvisoMapa] = useState('');

  const mapDiv = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const renderer = useRef<any>(null);

  // Lista local de lugares: destinos cadastrados + principais cidades do Brasil.
  const locais: Place[] = [
    ...(data?.destinos ?? [])
      .filter((d) => d.latitude != null && d.longitude != null)
      .map((d) => ({ nome: d.nome, sub: `${d.cidade}/${d.estado}`, lat: Number(d.latitude), lng: Number(d.longitude), tipo: 'destino' as const })),
    ...CIDADES_BR.map((c) => ({ nome: c.nome, sub: c.uf, lat: c.lat, lng: c.lng, tipo: 'cidade' as const })),
  ];

  // Padrão: São Paulo → Fernando de Noronha (exemplo).
  useEffect(() => {
    if (!data || origem || destino) return;
    const sp = locais.find((l) => norm(l.nome) === 'sao paulo') ?? locais.find((l) => l.tipo === 'cidade');
    const fn = locais.find((l) => norm(l.nome).includes('noronha')) ?? locais.find((l) => l.tipo === 'destino');
    if (sp) setOrigem(sp);
    if (fn) setDestino(fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Calcula a rota quando origem/destino mudam.
  useEffect(() => {
    if (!origem || !destino) { setDistancia(null); return; }
    const a: Coord = { lat: origem.lat, lng: origem.lng };
    const b: Coord = { lat: destino.lat, lng: destino.lng };
    let cancelado = false;
    const reta = () => { if (!cancelado) { setDistancia(haversineKm(a, b)); setFonte('reta'); } };

    setCalc(true); setAvisoMapa('');
    if (!hasMaps()) { reta(); setCalc(false); return; }

    loadGoogleMaps()
      .then((google) => {
        if (cancelado) return;
        if (!mapObj.current && mapDiv.current) {
          mapObj.current = new google.maps.Map(mapDiv.current, { center: a, zoom: 5, mapTypeControl: false, streetViewControl: false });
          renderer.current = new google.maps.DirectionsRenderer({ map: mapObj.current });
        }
        new google.maps.DirectionsService().route(
          { origin: a, destination: b, travelMode: google.maps.TravelMode.DRIVING },
          (res: any, status: string) => {
            if (cancelado) return;
            if (status === 'OK' && res.routes[0]?.legs[0]) {
              renderer.current?.setDirections(res);
              setDistancia(res.routes[0].legs[0].distance.value / 1000);
              setFonte('google');
            } else {
              setAvisoMapa('Sem rota rodoviária para este trecho (ex.: ilha/travessia). Usando distância em linha reta.');
              reta();
            }
            setCalc(false);
          },
        );
      })
      .catch((e) => { if (!cancelado) { setAvisoMapa(`${e.message}. Usando linha reta.`); reta(); setCalc(false); } });

    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origem?.lat, origem?.lng, destino?.lat, destino?.lng]);

  if (erro) return <Page><ErroBox msg={`Falha ao carregar: ${erro}`} /></Page>;
  if (loading || !data) return <Page><Loader linhas={4} /></Page>;

  const modos = [...data.transportes].sort((a, b) => Number(a.fator_emissao_co2_km) - Number(b.fator_emissao_co2_km));

  return (
    <Page>
      <PageTitle
        title="Planejar Rota"
        subtitle="Escolha de onde sai e para onde vai — veja a rota e o transporte com menos CO₂"
      />

      <Card className="p-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <PlaceCombo label="De onde você sai?" icone="📍" valor={origem} locais={locais} onSelect={setOrigem} placeholder="Ex.: São Paulo" />
          <PlaceCombo label="Para onde quer ir?" icone="🏁" valor={destino} locais={locais} onSelect={setDestino} placeholder="Ex.: Fernando de Noronha" />
        </div>
        {!hasMaps() && (
          <p className="text-xs text-gray-400 mt-3">
            Dica: escolha entre destinos e cidades da lista. Com a chave do Google Maps configurada,
            o campo busca <strong>qualquer endereço</strong> e traça a rota real no mapa.
          </p>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Rota</h3>
            {distancia != null && (
              <span className="text-sm font-bold text-emerald-700">
                {distancia.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km
                <span className="ml-1 text-[11px] font-normal text-gray-400">{fonte === 'google' ? '(rota real)' : '(linha reta)'}</span>
              </span>
            )}
          </div>
          {hasMaps() ? (
            <div ref={mapDiv} className="w-full h-72 rounded-xl bg-gray-100 overflow-hidden" />
          ) : (
            <MapaPlaceholder origem={origem} destino={destino} />
          )}
          {avisoMapa && <p className="text-xs text-amber-600 mt-2">{avisoMapa}</p>}
          {calc && <p className="text-xs text-gray-400 mt-2 animate-pulse">Calculando rota…</p>}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-gray-800 mb-1">Emissão por transporte nesta rota</h3>
          <p className="text-xs text-gray-400 mb-4">
            CO₂ estimado por pessoa {distancia != null ? `em ${distancia.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km` : ''}.
          </p>
          {distancia == null
            ? <p className="text-sm text-gray-400">Selecione origem e destino.</p>
            : <Comparacao modos={modos} distancia={distancia} />}
        </Card>
      </div>

      {distancia != null && <Recomendacao modos={modos} distancia={distancia} />}
    </Page>
  );
}

/* --------------------------------------------------------------------------- */

function PlaceCombo({
  label, icone, valor, locais, onSelect, placeholder,
}: {
  label: string; icone: string; valor: Place | null; locais: Place[];
  onSelect: (p: Place) => void; placeholder?: string;
}) {
  const [q, setQ] = useState('');
  const [aberto, setAberto] = useState(false);
  const [gpreds, setGpreds] = useState<{ id: string; descricao: string }[]>([]);
  const timer = useRef<any>(null);

  // Sincroniza o texto com o valor selecionado externamente.
  useEffect(() => { if (valor) setQ(valor.nome); }, [valor]);

  const consulta = norm(q);
  const locaisFiltrados = (consulta.length === 0
    ? locais
    : locais.filter((l) => norm(l.nome).includes(consulta) || (l.sub && norm(l.sub).includes(consulta)))
  ).slice(0, 7);

  function aoDigitar(v: string) {
    setQ(v); setAberto(true);
    if (timer.current) clearTimeout(timer.current);
    if (hasMaps() && v.trim().length >= 3) {
      timer.current = setTimeout(async () => setGpreds(await buscarSugestoes(v)), 250);
    } else {
      setGpreds([]);
    }
  }

  function escolherLocal(l: Place) { onSelect(l); setQ(l.nome); setAberto(false); setGpreds([]); }
  async function escolherGoogle(p: { id: string; descricao: string }) {
    const c = await coordsDoPlace(p.id);
    if (c) { onSelect({ nome: p.descricao, lat: c.lat, lng: c.lng, tipo: 'google' }); setQ(p.descricao); }
    setAberto(false); setGpreds([]);
  }

  return (
    <div className="relative">
      <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
        <span>{icone}</span> {label}
      </label>
      <input
        value={q}
        placeholder={placeholder}
        onChange={(e) => aoDigitar(e.target.value)}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
      />
      <AnimatePresence>
        {aberto && (locaisFiltrados.length > 0 || gpreds.length > 0) && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute z-30 mt-1 w-full bg-white rounded-xl shadow-xl border border-black/5 max-h-64 overflow-auto py-1"
          >
            {locaisFiltrados.map((l, i) => (
              <li key={`l${i}`}
                onMouseDown={(e) => { e.preventDefault(); escolherLocal(l); }}
                className="px-3 py-2 hover:bg-emerald-50 cursor-pointer flex items-center gap-2 text-sm"
              >
                <span>{l.tipo === 'destino' ? '🌿' : '🏙️'}</span>
                <span className="text-gray-800">{l.nome}</span>
                {l.sub && <span className="text-xs text-gray-400">{l.sub}</span>}
              </li>
            ))}
            {gpreds.length > 0 && (
              <li className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-gray-400">Google Maps</li>
            )}
            {gpreds.map((p) => (
              <li key={p.id}
                onMouseDown={(e) => { e.preventDefault(); escolherGoogle(p); }}
                className="px-3 py-2 hover:bg-emerald-50 cursor-pointer flex items-center gap-2 text-sm"
              >
                <span>📌</span><span className="text-gray-800">{p.descricao}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function Comparacao({ modos, distancia }: { modos: TipoTransporte[]; distancia: number }) {
  const max = Math.max(...modos.map((m) => Number(m.fator_emissao_co2_km) * distancia), 1);
  return (
    <div className="space-y-2.5">
      {modos.map((m, i) => {
        const fator = Number(m.fator_emissao_co2_km);
        const emissao = fator * distancia;
        const zero = fator <= 0;
        return (
          <div key={m.id_tipo_transporte} className="flex items-center gap-3">
            <span className="w-24 text-sm text-gray-700 flex items-center gap-1.5 shrink-0">
              <span className="text-base">{iconeDe(m.nome)}</span>{m.nome}
            </span>
            <div className="flex-1 bg-gray-100 rounded-full h-3.5 overflow-hidden">
              <motion.div
                className="h-3.5 rounded-full" style={{ backgroundColor: corFator(fator) }}
                initial={{ width: 0 }} animate={{ width: `${Math.max((emissao / max) * 100, zero ? 6 : 2)}%` }}
                transition={{ duration: 0.7, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <span className={`w-24 text-right text-xs font-semibold ${zero ? 'text-emerald-600' : 'text-gray-500'}`}>
              {zero ? '0 kg 🎉' : `${emissao.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Recomendacao({ modos, distancia }: { modos: TipoTransporte[]; distancia: number }) {
  const curta = distancia <= 15;
  const viaveis = modos.filter((m) => {
    const n = m.nome.toLowerCase();
    if ((n === 'bicicleta' || n === 'a pé') && !curta) return false;
    return true;
  });
  const melhor = viaveis[0] ?? modos[0];
  const carro = modos.find((m) => m.nome.toLowerCase() === 'carro');
  const economia = (Number(carro?.fator_emissao_co2_km ?? 0.192) - Number(melhor.fator_emissao_co2_km)) * distancia;

  return (
    <motion.div
      variants={fadeUp}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 bg-200 animate-gradient-pan text-white p-6 mt-4 shadow-lg shadow-emerald-700/20"
    >
      <div className="absolute -top-10 -right-6 w-40 h-40 rounded-full bg-white/10 blur-2xl animate-float-slow" />
      <div className="relative flex flex-col md:flex-row md:items-center gap-4">
        <div className="text-5xl animate-sway shrink-0">{iconeDe(melhor.nome)}</div>
        <div className="flex-1">
          <p className="text-emerald-50/80 text-xs uppercase tracking-wide font-semibold">Opção mais limpa</p>
          <h3 className="text-xl md:text-2xl font-extrabold">Vá de {melhor.nome}</h3>
          <p className="text-emerald-50/90 text-sm mt-1 max-w-xl">
            {Number(melhor.fator_emissao_co2_km) <= 0
              ? 'Zero emissão de CO₂ neste trajeto. Melhor impossível! 🌱'
              : `Emite ${(Number(melhor.fator_emissao_co2_km) * distancia).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg de CO₂`}
            {economia > 0 && <> — economiza <strong>{economia.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</strong> ante o carro.</>}
            {!curta && ' Para esta distância, bicicleta e caminhada não entram como opção.'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function MapaPlaceholder({ origem, destino }: { origem: Place | null; destino: Place | null }) {
  return (
    <div className="w-full h-72 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 flex flex-col items-center justify-center text-center p-6">
      <div className="text-4xl mb-2 animate-float">🗺️</div>
      <p className="text-sm font-semibold text-gray-700">{origem?.nome} → {destino?.nome}</p>
      <p className="text-xs text-gray-500 mt-2 max-w-xs">
        O mapa interativo do Google aparece aqui ao configurar a chave
        <code className="mx-1 px-1 py-0.5 rounded bg-emerald-100 text-emerald-800">VITE_GOOGLE_MAPS_API_KEY</code>.
        Por ora, a distância é estimada em linha reta.
      </p>
    </div>
  );
}
