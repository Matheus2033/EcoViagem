import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
} from 'recharts';
import { api } from '../api';
import { Card, PageTitle, Loader, ErroBox, Page } from '../components';
import { fadeUp, useCountUp } from '../lib/motion';
import { useAsync } from '../hooks/useAsync';

export default function Dashboard() {
  // Carrega os quatro conjuntos de dados do dashboard de uma vez.
  const { data, loading, erro } = useAsync(async () => {
    const [ind, ranking, transporte, ocupacao] = await Promise.all([
      api.indicadores(),
      api.rankingSustentabilidade(),
      api.transporte(),
      api.ocupacao(),
    ]);
    return { ind, ranking, transporte, ocupacao };
  });

  if (erro) return <Page><ErroBox msg={`Falha ao carregar: ${erro}. A API está rodando?`} /></Page>;
  if (loading || !data) return <Page><Loader linhas={4} /></Page>;
  const { ind, ranking, transporte, ocupacao } = data;

  const barColor = (v: number) => (v >= 70 ? '#059669' : v >= 45 ? '#d97706' : '#dc2626');

  return (
    <Page>
      <PageTitle title="Dashboard de Sustentabilidade" subtitle="Visão geral da plataforma e indicadores ambientais" />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Kpi icone="🗺️" rotulo="Destinos" valor={Number(ind.total_destinos)} />
        <Kpi icone="🏨" rotulo="Hospedagens" valor={Number(ind.total_hospedagens)} />
        <Kpi icone="✈️" rotulo="Viagens" valor={Number(ind.total_viagens)} />
        <Kpi icone="🌿" rotulo="Índice médio" valor={Number(ind.indice_medio)} decimais={1} sufixo="/100" />
        <Kpi icone="💨" rotulo="CO₂ total" valor={Number(ind.co2_total_kg)} sufixo=" kg" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold text-gray-800 mb-1">Ranking de destinos sustentáveis</h3>
          <p className="text-xs text-gray-400 mb-4">Índice de 0 a 100 (práticas, energia renovável, certificações e pegada)</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={ranking} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid horizontal={false} stroke="#eee" />
              <XAxis type="number" domain={[0, 100]} fontSize={12} />
              <YAxis type="category" dataKey="destino" width={120} fontSize={11} />
              <Tooltip cursor={{ fill: 'rgba(16,185,129,0.06)' }} formatter={(v) => [`${v}/100`, 'Índice']} />
              <Bar dataKey="indice_sustentabilidade" radius={[0, 6, 6, 0]} animationDuration={900}>
                {ranking.map((r, i) => <Cell key={i} fill={barColor(Number(r.indice_sustentabilidade))} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-gray-800 mb-1">Emissão de CO₂ por transporte</h3>
          <p className="text-xs text-gray-400 mb-4">Total acumulado nas viagens registradas (kg CO₂)</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={transporte} margin={{ left: 0, right: 10 }}>
              <CartesianGrid vertical={false} stroke="#eee" />
              <XAxis dataKey="transporte" fontSize={11} />
              <YAxis fontSize={12} />
              <Tooltip cursor={{ fill: 'rgba(13,148,136,0.06)' }} formatter={(v) => [`${Number(v).toLocaleString('pt-BR')} kg`, 'CO₂']} />
              <Bar dataKey="emissao_total_kg" fill="#0d9488" radius={[6, 6, 0, 0]} animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Ocupação */}
      <Card className="p-5 mt-4">
        <h3 className="font-semibold text-gray-800 mb-4">Ocupação atual vs. capacidade (controle de superlotação)</h3>
        <div className="space-y-3">
          {ocupacao.map((o, idx) => {
            const pct = Number(o.percentual_ocupacao_hoje);
            const cor = pct >= 80 ? '#dc2626' : pct >= 50 ? '#d97706' : '#059669';
            return (
              <div key={o.destino} className="flex items-center gap-3">
                <span className="w-40 text-sm text-gray-700 truncate">{o.destino}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <motion.div
                    className="h-3 rounded-full"
                    style={{ backgroundColor: cor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(pct, 100)}%` }}
                    transition={{ duration: 0.9, delay: 0.1 + idx * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <span className="w-28 text-right text-xs text-gray-500">
                  {o.ocupacao_hoje}/{o.capacidade_maxima_diaria} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </Page>
  );
}

function Kpi({ icone, rotulo, valor, sufixo = '', decimais = 0 }:
  { icone: string; rotulo: string; valor: number; sufixo?: string; decimais?: number }) {
  const animado = useCountUp(valor, { decimals: decimais });
  return (
    <Card hover className="p-4 relative overflow-hidden">
      {/* detalhe em degradê no canto */}
      <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-gradient-to-br from-emerald-200/50 to-teal-200/20 blur-xl" />
      <div className="relative inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-base shadow-sm shadow-emerald-600/20">
        {icone}
      </div>
      <div className="relative text-2xl font-extrabold text-gray-900 mt-2 tabular-nums">
        {animado}<span className="text-sm font-normal text-gray-400">{sufixo}</span>
      </div>
      <div className="relative text-xs text-gray-500">{rotulo}</div>
    </Card>
  );
}
