import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';
import type { Destino, TipoTransporte } from '../types';
import { Card, PageTitle, Loader, ErroBox, Page } from '../components';
import { fadeUp } from '../lib/motion';
import { useAsync } from '../hooks/useAsync';
import { hasMaps, loadGoogleMaps, haversineKm, type Coord } from '../lib/maps';

const ICONE: Record<string, string> = {
  'bicicleta': '🚲', 'a pé': '🚶', 'trem': '🚆', 'ônibus': '🚌',
  'onibus': '🚌', 'van': '🚐', 'carro': '🚗', 'avião': '✈️', 'aviao': '✈️',
};
const iconeDe = (n: string) => ICONE[n.trim().toLowerCase()] ?? '🚏';
const corFator = (f: number) => (f <= 0 ? '#059669' : f < 0.07 ? '#65a30d' : f < 0.15 ? '#d97706' : '#dc2626');

const coordDe = (d?: Destino | null): Coord | null => {
  if (!d || d.latitude == null || d.longitude == null) return null;
  const lat = Number(d.latitude), lng = Number(d.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

export default function Rotas() {
  const { data, loading, erro } = useAsync(async () => {
    const [destinos, transportes] = await Promise.all([api.destinos(), api.tiposTransporte()]);
    return { destinos, transportes };
  });

  const [origemId, setOrigemId] = useState<number | null>(null);
  const [destinoId, setDestinoId] = useState<number | null>(null);
  const [distancia, setDistancia] = useState<number | null>(null);
  const [fonte, setFonte] = useState<'google' | 'reta'>('reta');
  const [calc, setCalc] = useState(false);
  const [avisoMapa, setAvisoMapa] = useState('');

  const mapDiv = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const renderer = useRef<any>(null);

  const destinos = data?.destinos.filter((d) => coordDe(d)) ?? [];

  // Define origem/destino iniciais quando os dados chegam.
  useEffect(() => {
    if (destinos.length >= 2 && origemId == null) {
      setOrigemId(destinos[0].id_destino);
      setDestinoId(destinos[1].id_destino);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const origem = destinos.find((d) => d.id_destino === origemId) ?? null;
  const destino = destinos.find((d) => d.id_destino === destinoId) ?? null;

  // Calcula a rota sempre que origem/destino mudam.
  useEffect(() => {
    const a = coordDe(origem), b = coordDe(destino);
    if (!a || !b || origemId === destinoId) { setDistancia(null); return; }

    let cancelado = false;
    const reta = () => {
      if (cancelado) return;
      setDistancia(haversineKm(a, b));
      setFonte('reta');
    };

    setCalc(true);
    setAvisoMapa('');

    if (!hasMaps()) {
      reta();
      setCalc(false);
      return;
    }

    loadGoogleMaps()
      .then((google) => {
        if (cancelado) return;
        if (!mapObj.current && mapDiv.current) {
          mapObj.current = new google.maps.Map(mapDiv.current, { center: a, zoom: 6, mapTypeControl: false, streetViewControl: false });
          renderer.current = new google.maps.DirectionsRenderer({ map: mapObj.current });
        }
        const svc = new google.maps.DirectionsService();
        svc.route(
          { origin: a, destination: b, travelMode: google.maps.TravelMode.DRIVING },
          (res: any, status: string) => {
            if (cancelado) return;
            if (status === 'OK' && res.routes[0]?.legs[0]) {
              renderer.current?.setDirections(res);
              setDistancia(res.routes[0].legs[0].distance.value / 1000);
              setFonte('google');
            } else {
              setAvisoMapa('Não foi possível traçar a rota no mapa; usando distância em linha reta.');
              reta();
            }
            setCalc(false);
          },
        );
      })
      .catch((e) => {
        if (cancelado) return;
        setAvisoMapa(`${e.message}. Usando distância em linha reta.`);
        reta();
        setCalc(false);
      });

    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origemId, destinoId]);

  if (erro) return <Page><ErroBox msg={`Falha ao carregar: ${erro}`} /></Page>;
  if (loading || !data) return <Page><Loader linhas={4} /></Page>;

  const modos = [...data.transportes].sort(
    (a, b) => Number(a.fator_emissao_co2_km) - Number(b.fator_emissao_co2_km),
  );

  return (
    <Page>
      <PageTitle
        title="Planejar Rota"
        subtitle="Compare a pegada de carbono entre os destinos e escolha o transporte mais limpo"
      />

      {/* Seletores */}
      <Card className="p-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <Selo label="Origem" valor={origemId} destinos={destinos} onChange={setOrigemId} />
          <Selo label="Destino" valor={destinoId} destinos={destinos} onChange={setDestinoId} />
        </div>
        {origemId === destinoId && (
          <p className="text-xs text-amber-600 mt-3">Escolha uma origem diferente do destino.</p>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        {/* Mapa / rota */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Rota</h3>
            {distancia != null && (
              <span className="text-sm font-bold text-emerald-700">
                {distancia.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km
                <span className="ml-1 text-[11px] font-normal text-gray-400">
                  {fonte === 'google' ? '(rota real)' : '(linha reta)'}
                </span>
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

        {/* Comparação de emissões */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-800 mb-1">Emissão por transporte nesta rota</h3>
          <p className="text-xs text-gray-400 mb-4">
            CO₂ estimado por pessoa {distancia != null ? `em ${distancia.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km` : ''}.
          </p>

          {distancia == null ? (
            <p className="text-sm text-gray-400">Selecione origem e destino.</p>
          ) : (
            <Comparacao modos={modos} distancia={distancia} />
          )}
        </Card>
      </div>

      {/* Melhor escolha */}
      {distancia != null && <Recomendacao modos={modos} distancia={distancia} />}
    </Page>
  );
}

/* --------------------------------------------------------------------------- */

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
                className="h-3.5 rounded-full"
                style={{ backgroundColor: corFator(fator) }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max((emissao / max) * 100, zero ? 6 : 2)}%` }}
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
  // Modais viáveis pela distância (bike/caminhada só em trajetos curtos).
  const curta = distancia <= 15;
  const viaveis = modos.filter((m) => {
    const nome = m.nome.toLowerCase();
    if ((nome === 'bicicleta' || nome === 'a pé') && !curta) return false;
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
            {economia > 0 && (
              <> — economiza <strong>{economia.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</strong> ante o carro.</>
            )}
            {!curta && ' Para esta distância, bicicleta e caminhada não entram como opção.'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function Selo({
  label, valor, destinos, onChange,
}: {
  label: string; valor: number | null; destinos: Destino[]; onChange: (id: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <select
        value={valor ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
      >
        {destinos.map((d) => (
          <option key={d.id_destino} value={d.id_destino}>
            {d.nome} — {d.cidade}/{d.estado}
          </option>
        ))}
      </select>
    </label>
  );
}

function MapaPlaceholder({ origem, destino }: { origem: Destino | null; destino: Destino | null }) {
  return (
    <div className="w-full h-72 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 flex flex-col items-center justify-center text-center p-6">
      <div className="text-4xl mb-2 animate-float">🗺️</div>
      <p className="text-sm font-semibold text-gray-700">
        {origem?.nome} → {destino?.nome}
      </p>
      <p className="text-xs text-gray-500 mt-2 max-w-xs">
        O mapa interativo do Google aparece aqui ao configurar a chave
        <code className="mx-1 px-1 py-0.5 rounded bg-emerald-100 text-emerald-800">VITE_GOOGLE_MAPS_API_KEY</code>.
        Por ora, a distância é estimada em linha reta.
      </p>
    </div>
  );
}
