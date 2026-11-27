import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
} from 'recharts';
import { api } from '../api';
import { Card, PageTitle, Loader, ErroBox, Page } from '../components';
import { Icon, type IconName } from '../components/icons';
import { useCountUp } from '../lib/motion';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../context/auth';

/** Resultados: indicadores de um ambiente mais econômico e saudável. */
export default function Resultados() {
  const { usuario } = useAuth();
  const { data, loading, erro } = useAsync(async () => {
    const [ind, ranking, transporte, ocupacao, carteira] = await Promise.all([
      api.indicadores(),
      api.rankingSustentabilidade(),
      api.transporte(),
      api.ocupacao(),
      usuario ? api.ecoCarteira(usuario.id_usuario).catch(() => null) : Promise.resolve(null),
    ]);
    return { ind, ranking, transporte, ocupacao, carteira };
  }, [usuario?.id_usuario]);

  if (erro) return <Page><ErroBox msg={`Falha ao carregar: ${erro}. A API está rodando?`} /></Page>;
  if (loading || !data) return <Page><Loader linhas={4} /></Page>;
  const { ind, ranking, transporte, ocupacao, carteira } = data;

  const barColor = (v: number) => (v >= 70 ? '#15754E' : v >= 45 ? '#C8891E' : '#C2410C');

  return (
    <Page>
      <PageTitle
        title="Resultados: um ambiente mais econômico e saudável"
        subtitle="Como as escolhas dos viajantes reduzem emissões, custos e a pressão sobre os destinos"
      />

      {carteira && (
        <motion.div variants={fadeUpGrid} className="grid grid-cols-3 gap-3 mb-4">
          <Kpi icon="leaf" rotulo="Suas práticas sustentáveis" valor={Number(carteira.saldo.qtd_acoes)} />
          <Kpi icon="cloud" rotulo="CO₂ que você evitou" valor={Number(carteira.saldo.co2_evitado_kg)} decimais={1} sufixo=" kg" />
          <Kpi icon="coin" rotulo="EcoTokens ganhos" valor={Number(carteira.saldo.tokens_ganhos)} />
        </motion.div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Kpi icon="map" rotulo="Destinos" valor={Number(ind.total_destinos)} />
        <Kpi icon="bed" rotulo="Hospedagens" valor={Number(ind.total_hospedagens)} />
        <Kpi icon="send" rotulo="Viagens" valor={Number(ind.total_viagens)} />
        <Kpi icon="leaf" rotulo="Índice médio" valor={Number(ind.indice_medio)} decimais={1} sufixo="/100" destaque />
        <Kpi icon="cloud" rotulo="CO₂ total" valor={Number(ind.co2_total_kg)} sufixo=" kg" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-display font-semibold text-ink mb-1">Ranking de destinos sustentáveis</h3>
          <p className="text-xs text-pine/50 mb-4">Índice de 0 a 100 (práticas, energia renovável, certificações e pegada)</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={ranking} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid horizontal={false} stroke="#eceee8" />
              <XAxis type="number" domain={[0, 100]} fontSize={12} stroke="#8a978d" />
              <YAxis type="category" dataKey="destino" width={120} fontSize={11} stroke="#8a978d" />
              <Tooltip cursor={{ fill: 'rgba(21,117,78,0.06)' }} contentStyle={tooltipStyle} formatter={(v) => [`${v}/100`, 'Índice']} />
              <Bar dataKey="indice_sustentabilidade" radius={[0, 6, 6, 0]} animationDuration={900}>
                {ranking.map((r, i) => <Cell key={i} fill={barColor(Number(r.indice_sustentabilidade))} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-semibold text-ink mb-1">Emissão de CO₂ por transporte</h3>
          <p className="text-xs text-pine/50 mb-4">Total acumulado nas viagens registradas (kg CO₂)</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={transporte} margin={{ left: 0, right: 10 }}>
              <CartesianGrid vertical={false} stroke="#eceee8" />
              <XAxis dataKey="transporte" fontSize={11} stroke="#8a978d" />
              <YAxis fontSize={12} stroke="#8a978d" />
              <Tooltip cursor={{ fill: 'rgba(14,59,42,0.05)' }} contentStyle={tooltipStyle} formatter={(v) => [`${Number(v).toLocaleString('pt-BR')} kg`, 'CO₂']} />
              <Bar dataKey="emissao_total_kg" fill="#15754E" radius={[6, 6, 0, 0]} animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Ocupação */}
      <Card className="p-5 mt-4">
        <h3 className="font-display font-semibold text-ink mb-4">Ocupação atual vs. capacidade (controle de superlotação)</h3>
        <div className="space-y-3">
          {ocupacao.map((o, idx) => {
            const pct = Number(o.percentual_ocupacao_hoje);
            const cor = pct >= 80 ? '#C2410C' : pct >= 50 ? '#C8891E' : '#15754E';
            return (
              <div key={o.destino} className="flex items-center gap-3">
                <span className="w-40 text-sm text-ink/80 truncate">{o.destino}</span>
                <div className="flex-1 bg-ink/[0.06] rounded-full h-3 overflow-hidden">
                  <motion.div
                    className="h-3 rounded-full"
                    style={{ backgroundColor: cor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(pct, 100)}%` }}
                    transition={{ duration: 0.9, delay: 0.1 + idx * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <span className="w-28 text-right text-xs text-pine/50 tabular-nums">
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

const fadeUpGrid = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid rgba(16,42,32,0.10)',
  boxShadow: '0 12px 30px -16px rgba(16,42,32,0.4)',
  fontSize: 12,
} as const;

function Kpi({ icon, rotulo, valor, sufixo = '', decimais = 0, destaque = false }:
  { icon: IconName; rotulo: string; valor: number; sufixo?: string; decimais?: number; destaque?: boolean }) {
  const animado = useCountUp(valor, { decimals: decimais });

  if (destaque) {
    return (
      <Card hover className="p-4 relative overflow-hidden !bg-gradient-to-br !from-forest !to-pine text-white !border-pine">
        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-sprout/30 blur-2xl" />
        <div className="relative inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 text-sprout">
          <Icon name={icon} size={18} />
        </div>
        <div className="relative font-display text-2xl font-bold text-white mt-2 tabular-nums">
          {animado}<span className="text-sm font-medium text-emerald-100/70">{sufixo}</span>
        </div>
        <div className="relative text-xs text-emerald-100/70">{rotulo}</div>
      </Card>
    );
  }

  return (
    <Card hover className="p-4 relative overflow-hidden">
      <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-leaf/15 blur-xl" />
      <div className="relative inline-flex items-center justify-center w-9 h-9 rounded-xl bg-leaf/12 text-forest">
        <Icon name={icon} size={18} />
      </div>
      <div className="relative font-display text-2xl font-bold text-ink mt-2 tabular-nums">
        {animado}<span className="text-sm font-normal text-pine/40">{sufixo}</span>
      </div>
      <div className="relative text-xs text-pine/50">{rotulo}</div>
    </Card>
  );
}
