import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api';
import type { DestinoRecomendado, TipoTransporte } from '../types';
import { Card, PageTitle, Loader, ErroBox, Page, IndiceBadge } from '../components';
import { fadeUp, stagger } from '../lib/motion';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../context/auth';

const fmt = (n: number, d = 0) => n.toLocaleString('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: d });

/** Página principal: recomendações de destinos + guia de como viajar de forma sustentável. */
export default function Inicio() {
  const { usuario } = useAuth();
  const { data, loading, erro } = useAsync(async () => {
    const [rec, transportes, carteira] = await Promise.all([
      api.recomendacoes(usuario?.id_usuario, 6),
      api.tiposTransporte(),
      usuario ? api.ecoCarteira(usuario.id_usuario).catch(() => null) : Promise.resolve(null),
    ]);
    return { rec, transportes, carteira };
  }, [usuario?.id_usuario]);

  if (erro) return <Page><ErroBox msg={`Falha ao carregar: ${erro}. A API está rodando?`} /></Page>;
  if (loading || !data) return <Page><Loader linhas={4} /></Page>;
  const { rec, transportes, carteira } = data;
  const saldo = Number(carteira?.saldo.saldo ?? 0);

  return (
    <Page>
      {/* Hero */}
      <motion.div
        variants={fadeUp}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-forest via-forest to-pine bg-200 animate-gradient-pan text-white p-6 md:p-8 mb-6 shadow-lg shadow-emerald-800/20"
      >
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end gap-5">
          <div className="flex-1">
            <p className="text-emerald-100/80 text-sm font-medium">Olá, {usuario?.nome.split(' ')[0]} 👋</p>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight mt-1">
              Para onde vamos, sem pesar no planeta?
            </h1>
            <p className="text-emerald-50/90 mt-2 max-w-xl text-sm md:text-base">
              Recomendamos destinos com alto índice de sustentabilidade e pouca lotação, e mostramos
              como chegar lá emitindo menos CO₂.
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              <Link to="/rotas" className="bg-white text-emerald-700 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-emerald-50 transition">
                🧭 Planejar rota
              </Link>
              <Link to="/destinos" className="bg-white/15 ring-1 ring-white/30 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-white/25 transition">
                🗺️ Todos os destinos
              </Link>
            </div>
          </div>
          <Link to="/eco-tokens" className="shrink-0 bg-white/15 ring-1 ring-white/25 rounded-2xl px-5 py-4 hover:bg-white/20 transition">
            <p className="text-xs text-emerald-100/80 uppercase tracking-wide font-semibold">Seus EcoTokens</p>
            <p className="text-3xl font-extrabold tabular-nums">🪙 {fmt(saldo)}</p>
            <p className="text-xs text-emerald-100/80">Relate práticas e troque por viagens →</p>
          </Link>
        </div>
      </motion.div>

      {/* Recomendações */}
      <PageTitle title="Recomendados para você" subtitle="Ranqueados por sustentabilidade, lotação de hoje, avaliações e o seu perfil de viagem" />
      <motion.div variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {rec.destinos.map((d, i) => <CardDestino key={d.id_destino} d={d} posicao={i + 1} />)}
        {rec.destinos.length === 0 && <p className="text-gray-400">Nenhum destino cadastrado ainda.</p>}
      </motion.div>

      {/* Dicas personalizadas */}
      {rec.dicas && rec.dicas.length > 0 && (
        <Card className="p-5 mb-8 border-l-4 !border-l-emerald-500">
          <h3 className="font-semibold text-gray-800 mb-3">💡 Dicas para as suas próximas viagens</h3>
          <ul className="space-y-2">
            {rec.dicas.map((t, i) => (
              <li key={i} className="text-sm text-gray-600 flex gap-2"><span className="text-emerald-500">●</span>{t}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Como realizar uma viagem sustentável */}
      <PageTitle title="Como fazer uma viagem sustentável" subtitle="O passo a passo, do planejamento à volta para casa" />
      <Passos />

      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <ComparadorTransporte transportes={transportes} />
        <ChecklistMala />
      </div>
    </Page>
  );
}

/* --------------------------------------------------------------------------- */

function CardDestino({ d, posicao }: { d: DestinoRecomendado; posicao: number }) {
  const ocup = Number(d.percentual_ocupacao_hoje);
  const corOcup = ocup >= 80 ? 'text-red-600' : ocup >= 50 ? 'text-amber-600' : 'text-emerald-600';
  return (
    <motion.div variants={fadeUp} whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="bg-white/90 backdrop-blur rounded-2xl border border-black/5 shadow-[0_2px_14px_-8px_rgba(16,40,31,0.25)] hover:shadow-[0_18px_40px_-18px_rgba(16,40,31,0.3)] transition-shadow p-5 flex flex-col">
      <div className="flex justify-between items-start mb-2 gap-2">
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
          #{posicao} · {d.categoria}
        </span>
        <IndiceBadge valor={d.indice_sustentabilidade} />
      </div>
      <h3 className="font-bold text-gray-900 text-lg">{d.nome}</h3>
      <p className="text-sm text-gray-500">{d.cidade} · {d.estado}</p>
      <ul className="mt-3 space-y-1 flex-1">
        {d.motivos.map((m) => (
          <li key={m} className="text-xs text-gray-600 flex gap-1.5"><span className="text-emerald-500">✓</span>{m}</li>
        ))}
      </ul>
      <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-gray-100">
        <span className={corOcup}>Lotação hoje: {fmt(ocup)}%</span>
        {d.preco_min_eco != null && (
          <span className="text-gray-500">eco a partir de <strong className="text-gray-800">R$ {fmt(Number(d.preco_min_eco))}</strong></span>
        )}
      </div>
      <div className="flex gap-2 mt-3">
        <Link to={`/destinos/${d.id_destino}`} className="flex-1 text-center text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl transition">
          Ver destino
        </Link>
        <Link to={`/rotas?destino=${d.id_destino}`} className="flex-1 text-center text-sm font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2 rounded-xl transition">
          🧭 Traçar rota
        </Link>
      </div>
    </motion.div>
  );
}

const PASSOS = [
  { icone: '🗺️', titulo: 'Escolha bem o destino', texto: 'Prefira lugares com índice de sustentabilidade alto e lotação baixa. Viajar na baixa temporada reduz a pressão sobre a natureza e costuma ser mais barato.' },
  { icone: '🚆', titulo: 'Vá pelo transporte mais limpo', texto: 'O transporte é a maior parte da pegada de uma viagem. Em trechos de até ~800 km, ônibus e trem emitem uma fração do avião. Compare na aba Planejar Rota.' },
  { icone: '🏡', titulo: 'Hospede-se com selo verde', texto: 'Hospedagens com energia renovável, reuso de água e certificação (Green Key, ISO 14001) reduzem o impacto de cada noite.' },
  { icone: '🧺', titulo: 'Consuma local', texto: 'Contrate guias credenciados da região, coma em restaurantes de moradores e compre artesanato local: o dinheiro fica na comunidade.' },
  { icone: '🦜', titulo: 'Respeite a natureza', texto: 'Fique nas trilhas oficiais, não alimente animais, leve seu lixo de volta e use protetor solar sem oxibenzona em rios e mares.' },
  { icone: '🪙', titulo: 'Relate e ganhe EcoTokens', texto: 'Cada prática sustentável vale tokens que você troca por descontos, diárias e viagens nos parceiros.' },
];

function Passos() {
  return (
    <motion.div variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {PASSOS.map((p, i) => (
        <Card key={p.titulo} className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-forest to-pine text-white flex items-center justify-center text-lg shadow-sm">{p.icone}</span>
            <div>
              <p className="text-[11px] text-emerald-600 font-semibold uppercase tracking-wide">Passo {i + 1}</p>
              <h4 className="font-semibold text-gray-800 leading-tight">{p.titulo}</h4>
            </div>
          </div>
          <p className="text-sm text-gray-600">{p.texto}</p>
        </Card>
      ))}
    </motion.div>
  );
}

const ICONE: Record<string, string> = { 'avião': '✈️', 'carro': '🚗', 'van': '🚐', 'ônibus': '🚌', 'trem': '🚆', 'bicicleta': '🚲', 'a pé': '🚶' };

function ComparadorTransporte({ transportes }: { transportes: TipoTransporte[] }) {
  const [km, setKm] = useState(500);
  const modos = transportes
    .filter((t) => km <= 30 || Number(t.fator_emissao_co2_km) > 0)
    .sort((a, b) => Number(b.fator_emissao_co2_km) - Number(a.fator_emissao_co2_km));
  const max = Math.max(...modos.map((m) => Number(m.fator_emissao_co2_km) * km), 1);
  return (
    <Card className="p-5">
      <h3 className="font-semibold text-gray-800">Quanto CO₂ cada transporte emite?</h3>
      <p className="text-xs text-gray-400 mb-3">Por pessoa, para a distância escolhida (fatores do banco de dados)</p>
      <div className="flex items-center gap-3 mb-4">
        <input type="range" min={5} max={3000} step={5} value={km} onChange={(e) => setKm(Number(e.target.value))}
          className="flex-1 accent-emerald-600" aria-label="Distância em km" />
        <span className="w-20 text-right text-sm font-bold text-emerald-700 tabular-nums">{fmt(km)} km</span>
      </div>
      <div className="space-y-2">
        {modos.map((m) => {
          const kg = Number(m.fator_emissao_co2_km) * km;
          return (
            <div key={m.id_tipo_transporte} className="flex items-center gap-2">
              <span className="w-24 text-sm text-gray-700 shrink-0">{ICONE[m.nome.toLowerCase()] ?? '🚏'} {m.nome}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                <motion.div className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-teal-600"
                  animate={{ width: `${Math.max((kg / max) * 100, kg === 0 ? 3 : 1.5)}%` }} transition={{ duration: 0.4 }} />
              </div>
              <span className="w-20 text-right text-xs font-semibold text-gray-600 tabular-nums">{kg === 0 ? '0 kg 🌱' : `${fmt(kg, 1)} kg`}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

const MALA = [
  'Garrafa de água reutilizável', 'Sacola retrátil para compras', 'Talheres e canudo reutilizáveis',
  'Protetor solar sem oxibenzona', 'Saquinho para trazer o próprio lixo', 'Repelente e higiene em barra (sem plástico)',
  'Carregador solar / power bank', 'Roupas que secam rápido (menos lavagens)',
];

function ChecklistMala() {
  const KEY = 'ecoviagem_checklist_mala';
  const [marcados, setMarcados] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  });
  function alternar(item: string) {
    const novo = marcados.includes(item) ? marcados.filter((x) => x !== item) : [...marcados, item];
    setMarcados(novo);
    try { localStorage.setItem(KEY, JSON.stringify(novo)); } catch { /* armazenamento indisponível */ }
  }
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">🎒 Checklist da mala sustentável</h3>
        <span className="text-xs font-semibold text-emerald-700">{marcados.length}/{MALA.length}</span>
      </div>
      <p className="text-xs text-gray-400 mb-3">Marque o que você já vai levar</p>
      <div className="grid sm:grid-cols-2 gap-1.5">
        {MALA.map((item) => {
          const ok = marcados.includes(item);
          return (
            <label key={item} className={`flex items-center gap-2 text-sm px-2.5 py-2 rounded-lg cursor-pointer transition ${ok ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-gray-50 text-gray-600'}`}>
              <input type="checkbox" checked={ok} onChange={() => alternar(item)} className="accent-emerald-600" />
              {item}
            </label>
          );
        })}
      </div>
    </Card>
  );
}
