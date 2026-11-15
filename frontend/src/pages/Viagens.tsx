import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, Viagem, Destino, TipoTransporte } from '../api';
import { useAuth } from '../context/auth';
import { Card, PageTitle, Loader, ErroBox, StatusBadge, Page } from '../components';
import { fadeUp, stagger } from '../lib/motion';
import { buscarSugestoesOSM, rotaRodoviariaKm, haversineKm } from '../lib/maps';

interface TrechoForm { id_tipo_transporte: number; origem: string; destino: string; km: number; }

export default function Viagens() {
  const { usuario } = useAuth();
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [tipos, setTipos] = useState<TipoTransporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [abrirForm, setAbrirForm] = useState(false);

  function carregar() {
    api.viagensDoUsuario(usuario!.id_usuario)
      .then(setViagens)
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    carregar();
    api.destinos().then(setDestinos);
    api.tiposTransporte().then(setTipos);
    /* eslint-disable-next-line */
  }, []);

  return (
    <Page>
      <div className="flex justify-between items-center mb-6 gap-3">
        <PageTitle title="Minhas Viagens" subtitle="Acompanhe suas viagens e a pegada de carbono de cada uma" />
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
          onClick={() => setAbrirForm(!abrirForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap shadow-sm transition"
        >
          {abrirForm ? 'Fechar' : '+ Nova viagem'}
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
        {abrirForm && (
          <motion.div
            key="form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <NovaViagem
              destinos={destinos}
              tipos={tipos}
              onCriada={() => { setAbrirForm(false); carregar(); }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {erro && <ErroBox msg={erro} />}
      {loading ? <Loader linhas={3} /> : (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
          {viagens.map((v) => (
            <motion.div key={v.id_viagem} variants={fadeUp} whileHover={{ x: 3 }}
              className="bg-white/90 backdrop-blur rounded-2xl border border-black/5 shadow-[0_2px_14px_-8px_rgba(16,40,31,0.25)] p-5 flex flex-wrap justify-between items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{v.destino} · {v.estado}</h3>
                  <StatusBadge status={v.status} />
                </div>
                <p className="text-sm text-gray-500">
                  {fmt(v.data_inicio)} → {fmt(v.data_fim)} · {v.num_pessoas} pessoa(s)
                  {v.hospedagem && ` · 🏨 ${v.hospedagem}`}
                  {v.valor_total != null && ` (R$ ${Number(v.valor_total).toLocaleString('pt-BR')})`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">
                  {Number(v.emissao_total_kg ?? 0).toLocaleString('pt-BR')} <span className="text-sm font-normal text-gray-400">kg CO₂</span>
                </p>
                <p className="text-xs text-gray-400">{Number(v.emissao_por_pessoa_kg ?? 0).toFixed(1)} kg/pessoa</p>
              </div>
            </motion.div>
          ))}
          {viagens.length === 0 && <p className="text-gray-400">Você ainda não tem viagens. Crie a primeira!</p>}
        </motion.div>
      )}
    </Page>
  );
}

function NovaViagem({ destinos, tipos, onCriada }: { destinos: Destino[]; tipos: TipoTransporte[]; onCriada: () => void }) {
  const { usuario } = useAuth();
  const [form, setForm] = useState({ id_destino: '', data_inicio: '', data_fim: '', num_pessoas: 1 });
  const [trechos, setTrechos] = useState<TrechoForm[]>([]);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [calcKm, setCalcKm] = useState<number | null>(null); // índice do trecho em cálculo

  const fator = (id: number) => Number(tipos.find((t) => t.id_tipo_transporte === id)?.fator_emissao_co2_km ?? 0);

  // Calcula a distância REAL do trecho (OpenStreetMap + OSRM) a partir dos textos
  // de origem/destino — grátis, sem precisar de chave do Google Maps.
  async function calcularKm(i: number) {
    const t = trechos[i];
    if (!t.origem.trim() || !t.destino.trim()) { setErro('Preencha origem e destino do trecho para calcular a distância.'); return; }
    setErro(''); setCalcKm(i);
    try {
      const [o] = await buscarSugestoesOSM(t.origem);
      const [d] = await buscarSugestoesOSM(t.destino);
      if (!o || !d) { setErro('Não localizei origem e/ou destino. Tente nomes mais específicos (cidade, estado).'); return; }
      const rodo = await rotaRodoviariaKm({ lat: o.lat, lng: o.lng }, { lat: d.lat, lng: d.lng });
      const km = rodo ?? haversineKm({ lat: o.lat, lng: o.lng }, { lat: d.lat, lng: d.lng });
      setTrecho(i, 'km', Math.round(km * 10) / 10);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setCalcKm(null);
    }
  }

  // Estimativa de CO2 no cliente (a trigger do banco é a fonte oficial)
  const estimativa = trechos.reduce(
    (acc, t) => acc + t.km * form.num_pessoas * fator(t.id_tipo_transporte), 0);

  function addTrecho() {
    setTrechos([...trechos, { id_tipo_transporte: tipos[0]?.id_tipo_transporte ?? 1, origem: '', destino: '', km: 0 }]);
  }
  function setTrecho(i: number, campo: keyof TrechoForm, valor: any) {
    const novos = [...trechos];
    (novos[i] as any)[campo] = campo === 'km' || campo === 'id_tipo_transporte' ? Number(valor) : valor;
    setTrechos(novos);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(''); setEnviando(true);
    try {
      await api.criarViagem({
        id_usuario: usuario!.id_usuario,
        id_destino: Number(form.id_destino),
        data_inicio: form.data_inicio,
        data_fim: form.data_fim,
        num_pessoas: Number(form.num_pessoas),
        trechos,
      });
      onCriada();
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card className="p-5 mb-6 border-emerald-200">
      <h3 className="font-semibold text-gray-800 mb-4">Planejar nova viagem</h3>
      {erro && <ErroBox msg={erro} />}
      <form onSubmit={enviar} className="space-y-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="text-sm">
            <span className="text-gray-600">Destino</span>
            <select required value={form.id_destino} onChange={(e) => setForm({ ...form, id_destino: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-2">
              <option value="">Selecione...</option>
              {destinos.map((d) => <option key={d.id_destino} value={d.id_destino}>{d.nome}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-gray-600">Início</span>
            <input type="date" required value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-2" />
          </label>
          <label className="text-sm">
            <span className="text-gray-600">Fim</span>
            <input type="date" required value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-2" />
          </label>
          <label className="text-sm">
            <span className="text-gray-600">Pessoas</span>
            <input type="number" min={1} value={form.num_pessoas} onChange={(e) => setForm({ ...form, num_pessoas: Number(e.target.value) })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-2" />
          </label>
        </div>

        {/* Calculadora de pegada */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">🧮 Trechos de transporte</span>
            <button type="button" onClick={addTrecho} className="text-emerald-700 text-sm hover:underline">+ adicionar trecho</button>
          </div>
          <AnimatePresence initial={false}>
            {trechos.map((t, i) => (
              <motion.div key={i} layout
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
                <select value={t.id_tipo_transporte} onChange={(e) => setTrecho(i, 'id_tipo_transporte', e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white">
                  {tipos.map((tp) => <option key={tp.id_tipo_transporte} value={tp.id_tipo_transporte}>{tp.nome}</option>)}
                </select>
                <input placeholder="Origem (cidade ou endereço)" value={t.origem} onChange={(e) => setTrecho(i, 'origem', e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                <input placeholder="Destino (cidade ou endereço)" value={t.destino} onChange={(e) => setTrecho(i, 'destino', e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                <div className="flex gap-1">
                  <input type="number" placeholder="km" value={t.km || ''} onChange={(e) => setTrecho(i, 'km', e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-full min-w-0" />
                  <button type="button" onClick={() => calcularKm(i)} disabled={calcKm === i}
                    title="Calcular a distância real por estrada (OpenStreetMap/OSRM)"
                    className="shrink-0 px-2 rounded-lg border border-emerald-300 text-emerald-700 text-xs hover:bg-emerald-50 disabled:opacity-60">
                    {calcKm === i ? '…' : '🧭 km'}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {trechos.length === 0 && <p className="text-xs text-gray-400">Adicione trechos para estimar a pegada de carbono.</p>}
          {trechos.length > 0 && <p className="text-xs text-gray-400 mb-1">Dica: preencha origem e destino e clique em <strong>🧭 km</strong> para calcular a distância real por estrada.</p>}
          {trechos.length > 0 && (
            <motion.p layout className="text-sm mt-2">
              Estimativa de emissão:{' '}
              <motion.span key={estimativa.toFixed(1)} initial={{ scale: 1.15, color: '#10b981' }} animate={{ scale: 1, color: '#047857' }}
                className="font-bold inline-block">{estimativa.toFixed(1)} kg CO₂</motion.span>
              <span className="text-xs text-gray-400"> (cálculo oficial feito por trigger no banco)</span>
            </motion.p>
          )}
        </div>

        <motion.button disabled={enviando} whileHover={{ scale: enviando ? 1 : 1.03 }} whileTap={{ scale: 0.96 }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-60 transition">
          {enviando ? 'Salvando...' : 'Registrar viagem'}
        </motion.button>
      </form>
    </Card>
  );
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
