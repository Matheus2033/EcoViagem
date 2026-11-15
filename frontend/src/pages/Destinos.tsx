import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, Destino } from '../api';
import { PageTitle, Loader, ErroBox, IndiceBadge, Estrelas, Page } from '../components';
import { fadeUp, stagger } from '../lib/motion';

export default function Destinos() {
  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  function carregar() {
    setLoading(true);
    const params: Record<string, string> = {};
    if (busca) params.busca = busca;
    if (categoria) params.categoria = categoria;
    api.destinos(params)
      .then(setDestinos)
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [categoria]);

  const categorias = ['Ecológico', 'Praia', 'Montanha', 'Cultural', 'Rural'];

  return (
    <Page>
      <PageTitle title="Destinos" subtitle="Explore destinos ordenados pelo índice de sustentabilidade" />

      <motion.div variants={fadeUp} className="flex flex-wrap gap-2 mb-6">
        <form onSubmit={(e) => { e.preventDefault(); carregar(); }} className="flex gap-2">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar destino..."
            className="border border-gray-300 rounded-xl px-3.5 py-2 text-sm bg-white/80 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
          />
          <motion.button whileTap={{ scale: 0.96 }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 rounded-xl text-sm font-medium transition">
            Buscar
          </motion.button>
        </form>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white/80 outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Todas as categorias</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </motion.div>

      {erro && <ErroBox msg={erro} />}
      {loading ? <Loader linhas={3} /> : (
        <motion.div variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {destinos.map((d) => (
            <motion.div key={d.id_destino} variants={fadeUp} whileHover={{ y: -6 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}>
              <Link to={`/destinos/${d.id_destino}`}>
                <div className="group bg-white/90 backdrop-blur rounded-2xl border border-black/5 shadow-[0_2px_14px_-8px_rgba(16,40,31,0.25)] hover:shadow-[0_18px_40px_-18px_rgba(16,40,31,0.3)] hover:border-emerald-300 transition-all p-5 h-full">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {d.categoria}
                    </span>
                    <IndiceBadge valor={d.indice_sustentabilidade} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg group-hover:text-emerald-700 transition-colors">{d.nome}</h3>
                  <p className="text-sm text-gray-500">{d.cidade} · {d.estado}</p>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{d.descricao}</p>
                  <div className="mt-3 text-sm flex items-center gap-2">
                    {Number(d.qtd_avaliacoes) > 0 ? (
                      <>
                        <Estrelas nota={Number(d.media_nota)} />
                        <span className="text-gray-400 text-xs">({d.qtd_avaliacoes})</span>
                      </>
                    ) : (
                      <span className="text-gray-400 text-xs">Sem avaliações</span>
                    )}
                    <span className="ml-auto text-emerald-600 text-sm opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all">ver mais →</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
          {destinos.length === 0 && <p className="text-gray-400">Nenhum destino encontrado.</p>}
        </motion.div>
      )}
    </Page>
  );
}
