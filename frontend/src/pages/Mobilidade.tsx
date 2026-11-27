import { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';
import { Card, PageTitle, Loader, ErroBox, Page } from '../components';
import { Icon, iconeTransporte, type IconName } from '../components/icons';
import { fadeUp } from '../lib/motion';
import { useAsync } from '../hooks/useAsync';

// Classifica o fator de emissão (kg CO₂/km) em faixas.
function faixa(fator: number) {
  if (fator <= 0) return { rotulo: 'Zero emissão', cor: '#15754E', chip: 'bg-emerald-100 text-emerald-800' };
  if (fator < 0.07) return { rotulo: 'Baixa', cor: '#6FAE2F', chip: 'bg-lime-100 text-lime-800' };
  if (fator < 0.15) return { rotulo: 'Média', cor: '#C8891E', chip: 'bg-amber-100 text-amber-800' };
  return { rotulo: 'Alta', cor: '#C2410C', chip: 'bg-orange-100 text-orange-800' };
}

export default function Mobilidade() {
  const { data, loading, erro } = useAsync(() => api.tiposTransporte());
  const [dist, setDist] = useState(20);
  const [pessoas, setPessoas] = useState(1);

  if (erro) return <Page><ErroBox msg={`Falha ao carregar transportes: ${erro}`} /></Page>;
  if (loading || !data) return <Page><Loader linhas={4} /></Page>;

  // Ordena do mais limpo para o mais poluente.
  const modos = [...data].sort(
    (a, b) => Number(a.fator_emissao_co2_km) - Number(b.fator_emissao_co2_km),
  );
  const maxEmissao = Math.max(...modos.map((m) => Number(m.fator_emissao_co2_km) * dist * pessoas), 1);
  const carro = modos.find((m) => m.nome.toLowerCase() === 'carro');
  const fatorCarro = carro ? Number(carro.fator_emissao_co2_km) : 0.192;
  const economia = fatorCarro * dist * pessoas; // kg CO₂ poupados pedalando no lugar do carro
  const arvores = economia / 21; // 1 árvore absorve ~21 kg CO₂/ano

  return (
    <Page>
      <PageTitle
        title="Mobilidade Verde"
        subtitle="Escolha transportes que emitem menos CO₂ — e pedale sempre que der"
      />

      {/* Hero: incentivo à bicicleta */}
      <HeroBike economia={economia} arvores={arvores} />

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        {/* Calculadora */}
        <Card className="p-5">
          <h3 className="font-display font-semibold text-ink mb-1">Calculadora de pegada</h3>
          <p className="text-xs text-pine/50 mb-4">
            Veja quanto CO₂ cada transporte emite no seu trajeto.
          </p>

          <div className="space-y-5">
            <Slider label="Distância" valor={dist} min={1} max={300} onChange={setDist} sufixo=" km" />
            <Slider label="Pessoas" valor={pessoas} min={1} max={10} onChange={setPessoas} sufixo={pessoas > 1 ? ' pessoas' : ' pessoa'} />
          </div>

          <div className="mt-6 space-y-2.5">
            {modos.map((m, i) => {
              const emissao = Number(m.fator_emissao_co2_km) * dist * pessoas;
              const f = faixa(Number(m.fator_emissao_co2_km));
              const zero = Number(m.fator_emissao_co2_km) <= 0;
              return (
                <div key={m.id_tipo_transporte} className="flex items-center gap-3">
                  <span className="w-28 text-sm text-ink/80 flex items-center gap-2 shrink-0">
                    <Icon name={iconeTransporte(m.nome)} size={17} className="text-pine/60" />
                    {m.nome}
                  </span>
                  <div className="flex-1 bg-ink/[0.06] rounded-full h-3.5 overflow-hidden">
                    <motion.div
                      className="h-3.5 rounded-full"
                      style={{ backgroundColor: f.cor }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max((emissao / maxEmissao) * 100, zero ? 6 : 2)}%` }}
                      transition={{ duration: 0.7, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <span className={`w-20 text-right text-xs font-semibold tabular-nums ${zero ? 'text-forest' : 'text-pine/50'}`}>
                    {zero ? '0 kg' : `${emissao.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Ranking de modais */}
        <Card className="p-5">
          <h3 className="font-display font-semibold text-ink mb-1">Ranking de transportes limpos</h3>
          <p className="text-xs text-pine/50 mb-4">Fator de emissão por km rodado (kg CO₂).</p>
          <div className="space-y-2">
            {modos.map((m, i) => {
              const fator = Number(m.fator_emissao_co2_km);
              const f = faixa(fator);
              return (
                <motion.div
                  key={m.id_tipo_transporte}
                  variants={fadeUp}
                  whileHover={{ x: 3 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-leaf/[0.07] transition"
                >
                  <span className="w-6 text-center text-xs font-bold text-pine/40 tabular-nums">{i + 1}</span>
                  <span className="w-9 h-9 rounded-lg bg-leaf/10 text-forest flex items-center justify-center shrink-0">
                    <Icon name={iconeTransporte(m.nome)} size={18} />
                  </span>
                  <span className="flex-1 font-medium text-ink/80 text-sm">{m.nome}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${f.chip}`}>
                    {f.rotulo}
                  </span>
                  <span className="w-20 text-right text-xs text-pine/50 tabular-nums font-display">
                    {fator.toLocaleString('pt-BR', { minimumFractionDigits: 3 })}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Dicas de baixo carbono */}
      <Card className="p-5 mt-4">
        <h3 className="font-display font-semibold text-ink mb-4">Atitudes de baixo carbono</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Dica icon="bike" titulo="Pedale nos trajetos curtos" texto="Até 5 km, a bike costuma ser mais rápida que o carro na cidade — e zera a emissão." />
          <Dica icon="train" titulo="Prefira trem e metrô" texto="Transporte sobre trilhos emite até 6× menos CO₂ por km que o carro." />
          <Dica icon="car" titulo="Compartilhe a carona" texto="Dividir o carro reduz a emissão por pessoa — quanto mais gente, menor a pegada individual." />
          <Dica icon="bolt" titulo="Energia renovável" texto="Escolha hospedagens com energia solar/limpa e recarregue veículos elétricos na tomada verde." />
        </div>
      </Card>
    </Page>
  );
}

/* --------------------------------------------------------------------------- */

function HeroBike({ economia, arvores }: { economia: number; arvores: number }) {
  const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const eco = fmt(economia);
  const arv = fmt(arvores);
  return (
    <motion.div
      variants={fadeUp}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-forest via-forest to-pine bg-200 animate-gradient-pan text-white p-6 shadow-glow"
    >
      {/* bolhas decorativas */}
      <div className="absolute -top-10 -right-6 w-40 h-40 rounded-full bg-sprout/15 blur-2xl animate-float-slow" />
      <div className="absolute -bottom-12 left-1/3 w-40 h-40 rounded-full bg-leaf/15 blur-2xl animate-float" />

      <div className="relative flex flex-col md:flex-row md:items-center gap-5">
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 14 }}
          className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 animate-sway"
        >
          <Icon name="bike" size={34} strokeWidth={1.6} className="text-sprout" />
        </motion.div>
        <div className="flex-1">
          <h3 className="font-display text-xl md:text-2xl font-bold">Pedale e salve o planeta</h3>
          <p className="text-emerald-50/90 text-sm mt-1 max-w-xl">
            Trocar o carro pela bicicleta neste trajeto evitaria <strong>{eco} kg</strong> de CO₂ —
            o equivalente ao que <strong>{arv}</strong> árvores absorvem em um ano.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Mini valor={`${eco}`} unidade="kg CO₂ poupados" />
          <Mini valor={`${arv}`} unidade="árvores/ano" />
        </div>
      </div>
    </motion.div>
  );
}

function Mini({ valor, unidade }: { valor: string; unidade: string }) {
  return (
    <div className="bg-white/15 rounded-xl px-3 py-2 text-center min-w-[92px] backdrop-blur">
      <div className="font-display text-lg font-bold tabular-nums">{valor}</div>
      <div className="text-[10px] text-emerald-50/80 leading-tight">{unidade}</div>
    </div>
  );
}

function Slider({
  label, valor, min, max, onChange, sufixo = '',
}: {
  label: string; valor: number; min: number; max: number; onChange: (n: number) => void; sufixo?: string;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-ink/80">{label}</span>
        <span className="text-sm font-bold text-forest tabular-nums font-display">{valor}{sufixo}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-forest cursor-pointer"
      />
    </label>
  );
}

function Dica({ icon, titulo, texto }: { icon: IconName; titulo: string; texto: string }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="rounded-xl border border-leaf/20 bg-gradient-to-br from-leaf/[0.08] to-white p-4"
    >
      <div className="w-10 h-10 rounded-xl bg-leaf/12 text-forest flex items-center justify-center mb-2.5">
        <Icon name={icon} size={20} />
      </div>
      <div className="font-semibold text-ink text-sm">{titulo}</div>
      <p className="text-xs text-pine/55 mt-1 leading-relaxed">{texto}</p>
    </motion.div>
  );
}
