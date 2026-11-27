import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';
import type { OpcaoRota, OpcoesRota as Opcoes, TagRota } from '../types';
import { useAuth } from '../context/auth';
import { hasMaps, linkGoogleMaps, type ModoGoogle, type RotaGoogle } from '../lib/maps';
import { Card, ErroBox, Loader } from './index';

export interface PontoRota { nome: string; lat: number; lng: number; }

const fmt = (n: number, d = 0) => n.toLocaleString('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: d });
const reais = (n: number) => n <= 0 ? 'Grátis' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
function duracao(min: number) {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

const TAG: Record<TagRota, { rotulo: string; classe: string }> = {
  RECOMENDADA: { rotulo: '⭐ Recomendada', classe: 'bg-emerald-600 text-white' },
  MAIS_LIMPA: { rotulo: '🌱 Menos CO₂', classe: 'bg-emerald-100 text-emerald-700' },
  MAIS_RAPIDA: { rotulo: '⚡ Mais rápida', classe: 'bg-sky-100 text-sky-700' },
  MAIS_BARATA: { rotulo: '💰 Mais barata', classe: 'bg-amber-100 text-amber-700' },
};

type Ordem = 'recomendada' | 'co2' | 'tempo' | 'custo' | 'tokens';
const ORDENS: { id: Ordem; rotulo: string }[] = [
  { id: 'recomendada', rotulo: 'Recomendadas' }, { id: 'co2', rotulo: 'Menos CO₂' },
  { id: 'tempo', rotulo: 'Mais rápidas' }, { id: 'custo', rotulo: 'Mais baratas' }, { id: 'tokens', rotulo: 'Mais tokens' },
];

/**
 * Várias formas de fazer o trajeto, com CO₂, tempo, custo, economia e EcoTokens.
 * Os tokens vêm do servidor; com Google Maps, o tempo real substitui a estimativa.
 */
export function OpcoesRota({
  origem, destino, distancia, terrestre, rotasGoogle, onVerNoMapa,
}: {
  origem: PontoRota; destino: PontoRota; distancia: number | null; terrestre: boolean;
  rotasGoogle: Partial<Record<ModoGoogle, RotaGoogle | null>>;
  onVerNoMapa?: (modo: ModoGoogle) => void;
}) {
  const { usuario } = useAuth();
  const [dados, setDados] = useState<Opcoes | null>(null);
  const [erro, setErro] = useState('');
  const [ordem, setOrdem] = useState<Ordem>('recomendada');
  const [confirmar, setConfirmar] = useState<OpcaoRota | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [escolhidas, setEscolhidas] = useState<string[]>([]);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const payload = useMemo(() => ({
    id_usuario: usuario?.id_usuario,
    origem_nome: origem.nome, destino_nome: destino.nome,
    origem_lat: origem.lat, origem_lng: origem.lng, destino_lat: destino.lat, destino_lng: destino.lng,
    distancia_km: distancia ?? undefined, terrestre,
  }), [usuario?.id_usuario, origem.nome, origem.lat, origem.lng, destino.nome, destino.lat, destino.lng, distancia, terrestre]);

  useEffect(() => {
    let cancelado = false;
    setErro(''); setEscolhidas([]);
    api.rotaOpcoes(payload)
      .then((d) => { if (!cancelado) { setDados(d); setEscolhidas(d.modos_registrados ?? []); } })
      .catch((e) => { if (!cancelado) { setErro(e.message); setDados(null); } });
    return () => { cancelado = true; };
  }, [payload]);

  function avisar(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3800);
  }

  /** Tempo real do Google (quando disponível) para o modo da opção. */
  function tempoReal(o: OpcaoRota): number | null {
    if (!o.google_modo) return null;
    const g = rotasGoogle[o.google_modo];
    if (!g) return null;
    const extra = o.modo === 'CARONA' || o.modo === 'VAN' ? 15 : 0;
    return g.segundos / 60 + extra;
  }

  async function registrar(o: OpcaoRota) {
    setEnviando(true);
    try {
      const r = await api.rotaRegistrar({ ...payload, modo: o.modo });
      setEscolhidas((x) => [...x, o.modo]);
      setDados((d) => d ? { ...d, registradas_hoje: r.registradas_hoje } : d);
      setConfirmar(null);
      avisar(true, `+${r.tokens} EcoTokens! Você evitou ${fmt(r.co2_evitado_kg, 1)} kg de CO₂ 🌍`);
    } catch (e: any) {
      setConfirmar(null);
      avisar(false, e.message);
    } finally {
      setEnviando(false);
    }
  }

  if (erro) return <ErroBox msg={erro} />;
  if (!dados) return <Loader linhas={3} />;

  const opcoes = dados.opcoes.map((o) => ({ ...o, tempoReal: tempoReal(o) }));
  const tempo = (o: typeof opcoes[number]) => o.tempoReal ?? o.tempo_min;
  const ordenadas = [...opcoes].sort((a, b) => {
    switch (ordem) {
      case 'co2': return a.co2_kg - b.co2_kg;
      case 'tempo': return tempo(a) - tempo(b);
      case 'custo': return a.custo_reais - b.custo_reais;
      case 'tokens': return b.tokens - a.tokens;
      default: {
        const ra = a.tags.includes('RECOMENDADA') ? -1 : 0, rb = b.tags.includes('RECOMENDADA') ? -1 : 0;
        return ra - rb || a.co2_kg - b.co2_kg;
      }
    }
  });

  const rec = opcoes.find((o) => o.tags.includes('RECOMENDADA')) ?? opcoes[0];
  const carro = opcoes.find((o) => o.modo === 'CARRO');
  // Referência da economia: carro sozinho (ou o avião, quando não há estrada).
  const pior = carro ?? opcoes.reduce((p, o) => (o.co2_kg > p.co2_kg ? o : p), opcoes[0]);
  const economiaReais = carro ? carro.custo_reais - rec.custo_reais : 0;
  const maxCo2 = Math.max(...opcoes.map((o) => o.co2_kg), 0.01);
  const restantes = dados.limite_diario != null ? dados.limite_diario - (dados.registradas_hoje ?? 0) : null;

  return (
    <section className="mt-4">
      {/* Resumo da economia */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white p-5 md:p-6 shadow-lg shadow-emerald-700/20">
        <div className="absolute -top-10 -right-6 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-4">
          <div className="text-5xl shrink-0">{rec.icone}</div>
          <div className="flex-1">
            <p className="text-emerald-50/80 text-xs uppercase tracking-wide font-semibold">Melhor escolha para este trajeto</p>
            <h3 className="text-xl md:text-2xl font-extrabold">Vá de {rec.rotulo.toLowerCase()}</h3>
            <p className="text-emerald-50/90 text-sm mt-1">
              {rec.co2_evitado_kg > 0
                ? <>Evita <strong>{fmt(rec.co2_evitado_kg, 1)} kg de CO₂</strong> ({rec.economia_co2_pct}% a menos que {pior.rotulo.toLowerCase()})</>
                : <>É a opção viável para este trajeto</>}
              {economiaReais > 1 && <> e economiza <strong>{reais(economiaReais)}</strong> em relação ao carro sozinho</>}.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 shrink-0">
            <Resumo rotulo="CO₂" valor={`${fmt(rec.co2_kg, 1)} kg`} />
            <Resumo rotulo="Tempo" valor={duracao(tempo(rec))} />
            <Resumo rotulo="Tokens" valor={`🪙 ${rec.tokens}`} />
          </div>
        </div>
      </motion.div>

      {/* Ordenação */}
      <div className="flex flex-wrap items-center gap-2 mt-5 mb-3">
        <h3 className="font-semibold text-gray-800 mr-auto">
          {opcoes.length} formas de fazer este trajeto
          <span className="ml-2 text-xs font-normal text-gray-400">{fmt(dados.distancia_km)} km · CO₂ por pessoa</span>
        </h3>
        {ORDENS.map((o) => (
          <button key={o.id} onClick={() => setOrdem(o.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${ordem === o.id ? 'bg-emerald-600 text-white' : 'bg-white ring-1 ring-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {o.rotulo}
          </button>
        ))}
      </div>

      {/* Opções */}
      <motion.div layout className="space-y-2.5">
        <AnimatePresence initial={false}>
          {ordenadas.map((o) => {
            const escolhida = escolhidas.includes(o.modo);
            const pct = (o.co2_kg / maxCo2) * 100;
            const cor = o.co2_kg === 0 ? '#059669' : pct < 35 ? '#65a30d' : pct < 70 ? '#d97706' : '#dc2626';
            const podeVer = hasMaps() && o.google_modo && rotasGoogle[o.google_modo];
            return (
              <motion.div key={o.modo} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                className={`bg-white/90 rounded-2xl border p-4 ${o.tags.includes('RECOMENDADA') ? 'border-emerald-400 shadow-md shadow-emerald-600/10' : 'border-black/5'}`}>
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  {/* Identificação */}
                  <div className="flex items-center gap-3 md:w-64 shrink-0">
                    <span className="text-3xl">{o.icone}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{o.rotulo}</p>
                      <p className="text-[11px] text-gray-400 leading-snug">{o.detalhe}</p>
                      {o.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {o.tags.map((t) => (
                            <span key={t} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TAG[t].classe}`}>{TAG[t].rotulo}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Métricas */}
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[10px] text-gray-400 uppercase">CO₂</p>
                      <p className="text-sm font-bold text-gray-800">{o.co2_kg === 0 ? '0 kg 🌱' : `${fmt(o.co2_kg, 1)} kg`}</p>
                      <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                        <motion.div className="h-1.5 rounded-full" style={{ backgroundColor: cor }}
                          initial={{ width: 0 }} animate={{ width: `${Math.max(pct, o.co2_kg === 0 ? 3 : 2)}%` }} transition={{ duration: 0.6 }} />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">Tempo{o.tempoReal != null && <span className="text-emerald-600"> · Google</span>}</p>
                      <p className="text-sm font-bold text-gray-800">{o.tempoReal == null && '~'}{duracao(tempo(o))}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">Custo estim.</p>
                      <p className="text-sm font-bold text-gray-800">{reais(o.custo_reais)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">Economia</p>
                      <p className={`text-sm font-bold ${o.co2_evitado_kg > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {o.co2_evitado_kg > 0 ? `−${o.economia_co2_pct}% CO₂` : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex md:flex-col gap-2 md:w-44 shrink-0">
                    {usuario && o.tokens > 0 ? (
                      <button disabled={escolhida || restantes === 0} onClick={() => setConfirmar(o)}
                        className="flex-1 text-sm font-semibold px-3 py-2 rounded-xl transition bg-amber-500 hover:bg-amber-600 text-white disabled:bg-emerald-50 disabled:text-emerald-700">
                        {escolhida ? '✓ Registrada' : restantes === 0 ? 'Limite de hoje' : `Escolher · +${o.tokens} 🪙`}
                      </button>
                    ) : (
                      <span className="flex-1 text-center text-xs text-gray-400 px-3 py-2">Não gera tokens</span>
                    )}
                    <div className="flex gap-2 flex-1">
                      {podeVer && (
                        <button onClick={() => onVerNoMapa?.(o.google_modo!)} className="flex-1 text-xs font-medium px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">
                          Ver no mapa
                        </button>
                      )}
                      {o.google_modo && (
                        <a href={linkGoogleMaps(origem, destino, o.google_modo)} target="_blank" rel="noopener noreferrer"
                          className="flex-1 text-center text-xs font-medium px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">
                          Google Maps ↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      <Card className="p-4 mt-3">
        <p className="text-xs text-gray-500 leading-relaxed">
          🪙 <strong>Como ganhar tokens:</strong> escolha uma opção que emita menos que {pior.rotulo.toLowerCase()} e registre.
          Os tokens são proporcionais ao CO₂ evitado (5 + 0,5 por kg, +10 para bike/a pé, máx. 150), calculados pelo servidor.
          {restantes != null && <> Você pode registrar <strong>{Math.max(restantes, 0)} de {dados.limite_diario}</strong> rotas hoje.</>}{' '}
          Veja seu saldo em <Link to="/eco-tokens" className="text-emerald-700 font-medium hover:underline">EcoTokens</Link>.
        </p>
        <p className="text-[11px] text-gray-400 mt-1">{dados.observacao}</p>
      </Card>

      {/* Confirmação */}
      {createPortal(
        <AnimatePresence>
          {confirmar && (
            <motion.div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !enviando && setConfirmar(null)}>
              <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                <p className="text-4xl text-center">{confirmar.icone}</p>
                <h3 className="text-lg font-bold text-gray-900 text-center mt-2">Vou de {confirmar.rotulo.toLowerCase()}!</h3>
                <p className="text-sm text-gray-500 text-center mt-1">{origem.nome} → {destino.nome}</p>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-[11px] text-emerald-700">CO₂ evitado</p>
                    <p className="font-extrabold text-emerald-800">{fmt(confirmar.co2_evitado_kg, 1)} kg</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3 text-center">
                    <p className="text-[11px] text-amber-700">Você ganha</p>
                    <p className="font-extrabold text-amber-700">🪙 {confirmar.tokens}</p>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 text-center mt-3">Ao confirmar, você declara que fará este trajeto com este transporte.</p>
                <div className="flex gap-2 mt-4">
                  <button disabled={enviando} onClick={() => setConfirmar(null)} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium">Cancelar</button>
                  <button disabled={enviando} onClick={() => registrar(confirmar)} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-60">
                    {enviando ? 'Registrando…' : 'Confirmar'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {createPortal(
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-medium ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </section>
  );
}

function Resumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="bg-white/15 ring-1 ring-white/20 rounded-xl px-3 py-2 text-center min-w-[78px]">
      <p className="text-[10px] uppercase text-white/80">{rotulo}</p>
      <p className="text-sm font-extrabold whitespace-nowrap">{valor}</p>
    </div>
  );
}
