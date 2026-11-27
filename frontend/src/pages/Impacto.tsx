import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend,
} from 'recharts';
import { api } from '../api';
import type { Ecossistema, Risco } from '../types';
import { Card, PageTitle, Loader, ErroBox, Page } from '../components';
import { fadeUp, stagger } from '../lib/motion';
import { useAsync } from '../hooks/useAsync';

const TEMAS: Record<string, string> = {
  poluicao: '🏭 Poluição', clima: '🌡️ Clima', oceanos: '🌊 Oceanos', florestas: '🌳 Florestas', turismo: '🧳 Turismo',
};

const CENARIOS = [
  { id: 'reducao', rotulo: 'Poluição cai 50%', cor: 'emerald' },
  { id: 'atual', rotulo: 'Tendência atual', cor: 'amber' },
  { id: 'agravado', rotulo: 'Poluição +50%', cor: 'red' },
] as const;

const RISCO: Record<Risco, { rotulo: string; classe: string }> = {
  CRITICO: { rotulo: 'Crítico', classe: 'bg-red-100 text-red-700 ring-red-200' },
  ALTO: { rotulo: 'Alto', classe: 'bg-orange-100 text-orange-700 ring-orange-200' },
  MODERADO: { rotulo: 'Moderado', classe: 'bg-amber-100 text-amber-700 ring-amber-200' },
  BAIXO: { rotulo: 'Baixo até 2100', classe: 'bg-emerald-100 text-emerald-700 ring-emerald-200' },
};

const CORES_LINHA = ['#dc2626', '#ea580c', '#d97706', '#0d9488', '#2563eb', '#7c3aed'];

export default function Impacto() {
  return (
    <Page>
      <PageTitle
        title="Dados reais: o impacto da poluição"
        subtitle="Notícias atuais, indicadores com fonte e uma previsão de quais lugares podem entrar em colapso"
      />
      <Fatos />
      <Previsoes />
      <Noticias />
    </Page>
  );
}

/* --------------------------------------------------------------------------- */

function Fatos() {
  const { data, loading, erro } = useAsync(() => api.fatos());
  if (erro) return <ErroBox msg={erro} />;
  if (loading || !data) return <Loader linhas={2} />;
  return (
    <motion.div variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
      {data.map((f) => (
        <motion.a key={f.valor + f.texto} variants={fadeUp} href={f.link} target="_blank" rel="noopener noreferrer"
          whileHover={{ y: -4 }}
          className="block bg-white/90 rounded-2xl border border-black/5 shadow-[0_2px_14px_-8px_rgba(16,40,31,0.25)] p-4 hover:border-emerald-300 transition-colors">
          <div className="text-2xl">{f.icone}</div>
          <div className="text-xl font-extrabold text-gray-900 mt-1">{f.valor}</div>
          <p className="text-xs text-gray-600 mt-1 leading-snug">{f.texto}</p>
          <p className="text-[10px] text-emerald-700 mt-2 font-medium">Fonte: {f.fonte} ↗</p>
        </motion.a>
      ))}
    </motion.div>
  );
}

/* --------------------------------------------------------------------------- */

function Previsoes() {
  const [cenario, setCenario] = useState<string>('atual');
  const [livre, setLivre] = useState<number | null>(null);
  const [selecionados, setSelecionados] = useState<number[] | null>(null);

  const { data, loading, erro } = useAsync(
    () => api.previsoes(cenario, livre ?? undefined), [cenario, livre],
  );

  if (erro) return <ErroBox msg={erro} />;

  const ecos = data?.ecossistemas ?? [];
  const ativos = selecionados ?? ecos.slice(0, 4).map((e) => e.id_ecossistema);
  const visiveis = ecos.filter((e) => ativos.includes(e.id_ecossistema));

  // Série para o gráfico: [{ano, <nome>: saude, ...}]
  const anos = ecos[0]?.serie.map((p) => p.ano) ?? [];
  const serie = anos.map((ano) => {
    const linha: Record<string, number> = { ano };
    visiveis.forEach((e) => { linha[e.nome] = e.serie.find((p) => p.ano === ano)?.saude ?? 0; });
    return linha;
  });

  function alternar(id: number) {
    const atual = selecionados ?? ativos;
    const novo = atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id].slice(-6);
    setSelecionados(novo);
  }

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-red-400 to-amber-500" />
        <h3 className="text-xl font-extrabold text-gray-900">Previsão: lugares que podem desaparecer</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4 ml-4">
        Quando cada ecossistema perderia a maior parte das suas funções (saúde abaixo de 25/100) se a poluição seguir assim.
      </p>

      <Card className="p-5">
        {/* Controles de cenário */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {CENARIOS.map((c) => (
            <button key={c.id} onClick={() => { setCenario(c.id); setLivre(null); }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium ring-1 transition ${
                livre == null && cenario === c.id
                  ? c.cor === 'emerald' ? 'bg-emerald-600 text-white ring-emerald-600'
                    : c.cor === 'amber' ? 'bg-amber-500 text-white ring-amber-500' : 'bg-red-600 text-white ring-red-600'
                  : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50'
              }`}>
              {c.rotulo}
            </button>
          ))}
          <div className="flex items-center gap-2 ml-auto text-sm text-gray-600 w-full sm:w-auto">
            <span className="shrink-0">Simular poluição:</span>
            <input type="range" min={-100} max={100} step={10} value={livre ?? 0}
              onChange={(e) => setLivre(Number(e.target.value))} className="accent-emerald-600 flex-1 sm:w-36" aria-label="Variação da poluição" />
            <span className={`w-12 text-right font-bold tabular-nums ${(livre ?? 0) < 0 ? 'text-emerald-600' : (livre ?? 0) > 0 ? 'text-red-600' : 'text-gray-500'}`}>
              {livre == null ? '—' : `${livre > 0 ? '+' : ''}${livre}%`}
            </span>
          </div>
        </div>

        {loading && !data ? <Loader linhas={3} /> : (
          <>
            <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={serie} margin={{ left: -10, right: 10, top: 5 }}>
                  <CartesianGrid stroke="#eee" vertical={false} />
                  <XAxis dataKey="ano" fontSize={12} />
                  <YAxis domain={[0, 100]} fontSize={12} />
                  <Tooltip formatter={(v, n) => [`${v}/100`, n]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={25} stroke="#dc2626" strokeDasharray="5 4" label={{ value: 'colapso', fontSize: 11, fill: '#dc2626', position: 'insideTopRight' }} />
                  {visiveis.map((e, i) => (
                    <Line key={e.id_ecossistema} type="monotone" dataKey={e.nome} stroke={CORES_LINHA[i % CORES_LINHA.length]}
                      strokeWidth={2.5} dot={false} animationDuration={700} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-gray-400 mt-1">Clique nos cards abaixo para escolher o que aparece no gráfico (até 6).</p>

            <motion.div variants={stagger} initial="hidden" animate="show" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {ecos.map((e) => (
                <CardEcossistema key={e.id_ecossistema} e={e} ativo={ativos.includes(e.id_ecossistema)}
                  cor={CORES_LINHA[visiveis.findIndex((v) => v.id_ecossistema === e.id_ecossistema) % CORES_LINHA.length]}
                  onClick={() => alternar(e.id_ecossistema)} />
              ))}
            </motion.div>

            <details className="mt-4 text-xs text-gray-500">
              <summary className="cursor-pointer font-medium text-gray-600">Como a previsão é calculada?</summary>
              <p className="mt-2 leading-relaxed">{data?.metodologia}</p>
              <p className="mt-1 leading-relaxed">
                Endpoint público da API: <code className="bg-gray-100 px-1 rounded">GET /api/previsoes/extincao?cenario=atual</code>,{' '}
                <code className="bg-gray-100 px-1 rounded">?variacao=-30</code> ou{' '}
                <code className="bg-gray-100 px-1 rounded">POST /api/previsoes/simular</code>.
              </p>
            </details>
          </>
        )}
      </Card>
    </section>
  );
}

function CardEcossistema({ e, ativo, cor, onClick }: { e: Ecossistema; ativo: boolean; cor?: string; onClick: () => void }) {
  const r = RISCO[e.risco];
  return (
    <motion.button variants={fadeUp} onClick={onClick} type="button"
      className={`text-left rounded-xl border p-3.5 transition ${ativo ? 'border-emerald-400 bg-emerald-50/40' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
            {ativo && cor && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cor }} />}
            <span className="truncate">{e.nome}</span>
          </p>
          <p className="text-[11px] text-gray-400">{e.localizacao} · {e.pais} · {e.tipo}</p>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${r.classe}`}>{r.rotulo}</span>
      </div>
      <div className="flex items-end gap-4 mt-2">
        <div>
          <p className="text-[10px] text-gray-400 uppercase">Colapso previsto</p>
          <p className="text-lg font-extrabold text-gray-900 tabular-nums">{e.ano_colapso ?? 'após 2200'}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase">Saúde hoje → 2050</p>
          <p className="text-sm font-semibold text-gray-700 tabular-nums">{Number(e.saude_atual).toFixed(0)} → {e.saude_2050.toFixed(0)}</p>
        </div>
      </div>
      <p className="text-[11px] text-gray-600 mt-2"><strong>Ameaça:</strong> {e.ameaca_principal}</p>
      <p className="text-[11px] text-gray-500 mt-1 line-clamp-3">{e.evidencia}</p>
      <p className="text-[10px] text-emerald-700 mt-1">Fonte: {e.fonte}</p>
    </motion.button>
  );
}

/* --------------------------------------------------------------------------- */

function Noticias() {
  const [tema, setTema] = useState('poluicao');
  const { data, loading, erro } = useAsync(() => api.noticias(tema, 12), [tema]);

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-2.5 mr-auto">
          <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-sky-400 to-teal-600" />
          <h3 className="text-xl font-extrabold text-gray-900">Notícias recentes</h3>
          {data && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${data.ao_vivo ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
              {data.ao_vivo ? '● AO VIVO' : 'OFFLINE'}
            </span>
          )}
        </div>
        {Object.entries(TEMAS).map(([id, rotulo]) => (
          <button key={id} onClick={() => setTema(id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${tema === id ? 'bg-emerald-600 text-white' : 'bg-white ring-1 ring-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {rotulo}
          </button>
        ))}
      </div>

      {erro && <ErroBox msg={erro} />}
      {loading ? <Loader linhas={3} /> : (
        <AnimatePresence mode="wait">
          <motion.div key={tema} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data?.itens.map((n) => (
              <a key={n.link} href={n.link} target="_blank" rel="noopener noreferrer"
                className="group bg-white/90 rounded-xl border border-black/5 p-4 hover:border-emerald-300 hover:shadow-md transition flex flex-col">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-emerald-700 line-clamp-3 flex-1">{n.titulo}</p>
                <div className="flex items-center justify-between mt-3 text-[11px] text-gray-400">
                  <span className="font-medium text-gray-500 truncate">{n.fonte}</span>
                  {n.data && <span className="shrink-0 ml-2">{new Date(n.data).toLocaleDateString('pt-BR')}</span>}
                </div>
              </a>
            ))}
            {data?.itens.length === 0 && <p className="text-gray-400 text-sm">Nenhuma notícia encontrada.</p>}
          </motion.div>
        </AnimatePresence>
      )}
      {data && <p className="text-[11px] text-gray-400 mt-2">Fonte: {data.fonte}. Os links abrem o site do veículo original.</p>}
    </section>
  );
}
