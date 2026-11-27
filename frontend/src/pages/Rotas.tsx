import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';
import { Card, PageTitle, Loader, ErroBox, Page } from '../components';
import { OpcoesRota } from '../components/OpcoesRota';
import { useAsync } from '../hooks/useAsync';
import {
  hasMaps, loadGoogleMaps, haversineKm, buscarSugestoes, coordsDoPlace,
  buscarSugestoesOSM, rotaRodoviariaKm, rotaGoogle, linkGoogleMaps, MODOS_GOOGLE,
  type Coord, type SugestaoGeo, type ModoGoogle, type RotaGoogle,
} from '../lib/maps';
import { CIDADES_BR } from '../lib/placesBR';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface Place { nome: string; sub?: string; lat: number; lng: number; tipo: 'destino' | 'cidade' | 'google' | 'osm'; }

export default function Rotas() {
  const { data, loading, erro } = useAsync(async () => {
    const [destinos, transportes] = await Promise.all([api.destinos(), api.tiposTransporte()]);
    return { destinos, transportes };
  });

  const [origem, setOrigem] = useState<Place | null>(null);
  const [destino, setDestino] = useState<Place | null>(null);
  const [distancia, setDistancia] = useState<number | null>(null);
  const [fonte, setFonte] = useState<'google' | 'osrm' | 'reta'>('reta');
  const [calc, setCalc] = useState(false);
  const [avisoMapa, setAvisoMapa] = useState('');
  const [rotasG, setRotasG] = useState<Partial<Record<ModoGoogle, RotaGoogle | null>>>({});
  const [modoMapa, setModoMapa] = useState<ModoGoogle>('DRIVING');
  const [params] = useSearchParams();
  const destinoParam = Number(params.get('destino')) || null;

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

  // Padrão: São Paulo → destino vindo da recomendação (?destino=id) ou Fernando de Noronha.
  useEffect(() => {
    if (!data || origem || destino) return;
    const sp = locais.find((l) => norm(l.nome) === 'sao paulo') ?? locais.find((l) => l.tipo === 'cidade');
    const escolhido = destinoParam ? data.destinos.find((d) => d.id_destino === destinoParam) : undefined;
    const fn = (escolhido && locais.find((l) => l.tipo === 'destino' && l.nome === escolhido.nome))
      ?? locais.find((l) => norm(l.nome).includes('noronha')) ?? locais.find((l) => l.tipo === 'destino');
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

    // Sem chave do Google: calcula a distância rodoviária REAL via OSRM (grátis);
    // se não houver rota por estrada (ilha/travessia aérea), cai para linha reta.
    if (!hasMaps()) {
      rotaRodoviariaKm(a, b).then((km) => {
        if (cancelado) return;
        if (km != null) { setDistancia(km); setFonte('osrm'); }
        else {
          setAvisoMapa('Sem rota rodoviária para este trecho (ex.: ilha/travessia aérea). Usando distância em linha reta.');
          reta();
        }
        setCalc(false);
      });
      return () => { cancelado = true; };
    }

    // Com chave: Google Maps real — rotas de carro, transporte público, bike e a pé.
    setRotasG({});
    loadGoogleMaps()
      .then(async (google) => {
        if (cancelado) return;
        if (!mapObj.current && mapDiv.current) {
          mapObj.current = new google.maps.Map(mapDiv.current, { center: a, zoom: 5, mapTypeControl: false, streetViewControl: false });
          renderer.current = new google.maps.DirectionsRenderer({ map: mapObj.current });
        }
        const resultados = await Promise.all(MODOS_GOOGLE.map((m) => rotaGoogle(a, b, m.id).catch(() => null)));
        if (cancelado) return;
        const porModo: Partial<Record<ModoGoogle, RotaGoogle | null>> = {};
        MODOS_GOOGLE.forEach((m, i) => { porModo[m.id] = resultados[i]; });
        setRotasG(porModo);

        const carro = porModo.DRIVING;
        const primeira = carro ?? resultados.find((r) => r != null) ?? null;
        if (primeira) {
          setModoMapa(primeira.modo);
          renderer.current?.setDirections(primeira.resultado);
          setDistancia((carro ?? primeira).km);
          setFonte('google');
        } else {
          renderer.current?.set('directions', null); // limpa a rota anterior do mapa
          setAvisoMapa('O Google não encontrou rota terrestre (ex.: ilha/travessia aérea). Usando distância em linha reta.');
          reta();
        }
        setCalc(false);
      })
      .catch((e) => { if (!cancelado) { setAvisoMapa(`${e.message}. Usando linha reta.`); reta(); setCalc(false); } });

    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origem?.lat, origem?.lng, destino?.lat, destino?.lng]);

  if (erro) return <Page><ErroBox msg={`Falha ao carregar: ${erro}`} /></Page>;
  if (loading || !data) return <Page><Loader linhas={4} /></Page>;

  // Sem rota por estrada (ex.: ilha) → só opções aéreas; trechos curtos sempre são terrestres.
  const terrestre = fonte !== 'reta'
    || (origem != null && destino != null && haversineKm(origem, destino) <= 50);

  function verNoMapa(modo: ModoGoogle) {
    const r = rotasG[modo];
    if (!r) return;
    setModoMapa(modo);
    renderer.current?.setDirections(r.resultado);
    mapDiv.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <Page>
      <PageTitle
        title="Planejar Rota"
        subtitle="Compare várias formas de fazer o trajeto, economize CO₂ e dinheiro e ganhe EcoTokens"
      />

      <Card className="p-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <PlaceCombo label="De onde você sai?" icone="📍" valor={origem} locais={locais} onSelect={setOrigem} placeholder="Digite uma cidade ou endereço" />
          <PlaceCombo label="Para onde quer ir?" icone="🏁" valor={destino} locais={locais} onSelect={setDestino} placeholder="Digite o destino" />
        </div>
      </Card>

      <div className="mt-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Rota</h3>
            {distancia != null && (
              <span className="text-sm font-bold text-emerald-700">
                {distancia.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km
                <span className="ml-1 text-[11px] font-normal text-gray-400">{fonte === 'reta' ? '(linha reta)' : '(rota real)'}</span>
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

          {hasMaps() && Object.keys(rotasG).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
              {MODOS_GOOGLE.map((m) => {
                const r = rotasG[m.id];
                const ativo = modoMapa === m.id && !!r;
                return (
                  <button key={m.id} type="button" disabled={!r}
                    onClick={() => { if (r) { setModoMapa(m.id); renderer.current?.setDirections(r.resultado); } }}
                    className={`text-left rounded-xl px-3 py-2 ring-1 transition ${ativo ? 'ring-emerald-500 bg-emerald-50' : 'ring-gray-200 hover:bg-gray-50'} disabled:opacity-50`}>
                    <p className="text-xs text-gray-500">{m.icone} {m.rotulo}</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {r ? `${r.duracao} · ${r.km.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km` : 'sem rota'}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {origem && destino && (
            <a href={linkGoogleMaps({ lat: origem.lat, lng: origem.lng }, { lat: destino.lat, lng: destino.lng }, hasMaps() ? modoMapa : 'TRANSIT')}
              target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800">
              🗺️ Abrir esta rota no Google Maps ↗
            </a>
          )}
        </Card>
      </div>

      {origem && destino && distancia != null && !calc && (
        <OpcoesRota
          origem={{ nome: origem.nome, lat: origem.lat, lng: origem.lng }}
          destino={{ nome: destino.nome, lat: destino.lat, lng: destino.lng }}
          distancia={fonte === 'reta' ? null : distancia}
          terrestre={terrestre}
          rotasGoogle={rotasG}
          onVerNoMapa={verNoMapa}
        />
      )}
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
  const [osmPreds, setOsmPreds] = useState<SugestaoGeo[]>([]);
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
    if (v.trim().length >= 3) {
      if (hasMaps()) {
        timer.current = setTimeout(async () => { setGpreds(await buscarSugestoes(v)); setOsmPreds([]); }, 250);
      } else {
        // Sem chave do Google: autocomplete de endereços reais via OpenStreetMap.
        timer.current = setTimeout(async () => { setOsmPreds(await buscarSugestoesOSM(v)); setGpreds([]); }, 350);
      }
    } else {
      setGpreds([]); setOsmPreds([]);
    }
  }

  function escolherLocal(l: Place) { onSelect(l); setQ(l.nome); setAberto(false); setGpreds([]); setOsmPreds([]); }
  async function escolherGoogle(p: { id: string; descricao: string }) {
    const c = await coordsDoPlace(p.id);
    if (c) { onSelect({ nome: p.descricao, lat: c.lat, lng: c.lng, tipo: 'google' }); setQ(p.descricao); }
    setAberto(false); setGpreds([]);
  }
  function escolherOSM(p: SugestaoGeo) {
    onSelect({ nome: p.descricao, lat: p.lat, lng: p.lng, tipo: 'osm' });
    setQ(p.descricao); setAberto(false); setOsmPreds([]);
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
        {aberto && (locaisFiltrados.length > 0 || gpreds.length > 0 || osmPreds.length > 0) && (
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
            {osmPreds.length > 0 && (
              <li className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-gray-400">Endereços (OpenStreetMap)</li>
            )}
            {osmPreds.map((p, i) => (
              <li key={`osm${i}`}
                onMouseDown={(e) => { e.preventDefault(); escolherOSM(p); }}
                className="px-3 py-2 hover:bg-emerald-50 cursor-pointer flex items-center gap-2 text-sm"
              >
                <span>📌</span><span className="text-gray-800 line-clamp-1">{p.descricao}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function MapaPlaceholder({ origem, destino }: { origem: Place | null; destino: Place | null }) {
  return (
    <div className="w-full h-72 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 flex flex-col items-center justify-center text-center p-6">
      <div className="flex items-center gap-3 text-3xl mb-3">
        <span>📍</span>
        <span className="text-emerald-300 tracking-widest text-lg">• • • •</span>
        <span>🏁</span>
      </div>
      <p className="text-base font-semibold text-gray-800">
        {origem?.nome ?? '—'} <span className="text-emerald-600">→</span> {destino?.nome ?? '—'}
      </p>
      <p className="text-xs text-gray-400 mt-2">Trajeto da sua viagem</p>
    </div>
  );
}
