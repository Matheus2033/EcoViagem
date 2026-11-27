import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, Destino } from '../api';
import { PageTitle, Loader, ErroBox, IndiceBadge, Estrelas, Page } from '../components';
import { Icon } from '../components/icons';
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
          <div className="relative">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-pine/40" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar destino..."
              className="border border-ink/[0.08] rounded-xl pl-9 pr-3.5 py-2 text-sm bg-white/80 focus:ring-2 focus:ring-forest/40 focus:border-forest outline-none transition"
            />
          </div>
          <motion.button whileTap={{ scale: 0.96 }} className="bg-pine hover:bg-pine-600 text-white px-4 rounded-xl text-sm font-medium transition shadow-glow">
            Buscar
          </motion.button>
        </form>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="border border-ink/[0.08] rounded-xl px-3 py-2 text-sm bg-white/80 outline-none focus:ring-2 focus:ring-forest/40 text-ink/80"
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
                <div className="group bg-white/90 backdrop-blur rounded-2xl border border-ink/[0.07] shadow-soft hover:shadow-lift hover:border-leaf/40 transition-all overflow-hidden h-full flex flex-col">
                  {/* Faixa visual com padrão e selos */}
                  <div className="relative h-24 bg-gradient-to-br from-forest to-pine overflow-hidden">
                    <div className="absolute inset-0 opacity-30" style={{
                      backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(207,242,155,0.5), transparent 45%), radial-gradient(circle at 80% 70%, rgba(139,211,74,0.35), transparent 40%)',
                    }} />
                    <Icon name="map-pin" size={64} strokeWidth={1.2}
                      className="absolute -right-2 -bottom-3 text-white/10 group-hover:scale-110 transition-transform" />
                    <div className="absolute top-3 left-3">
                      <span className="text-[11px] font-semibold text-pine bg-white/90 px-2.5 py-1 rounded-full backdrop-blur">
                        {d.categoria}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <IndiceBadge valor={d.indice_sustentabilidade} />
                    </div>
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-display font-bold text-ink text-lg group-hover:text-forest transition-colors">{d.nome}</h3>
                    <p className="text-sm text-pine/55 flex items-center gap-1 mt-0.5">
                      <Icon name="map-pin" size={13} className="text-pine/40" /> {d.cidade} · {d.estado}
                    </p>
                    <p className="text-sm text-ink/60 mt-2 line-clamp-2">{d.descricao}</p>
                    <div className="mt-auto pt-3 text-sm flex items-center gap-2">
                      {Number(d.qtd_avaliacoes) > 0 ? (
                        <>
                          <Estrelas nota={Number(d.media_nota)} />
                          <span className="text-pine/40 text-xs">({d.qtd_avaliacoes})</span>
                        </>
                      ) : (
                        <span className="text-pine/40 text-xs">Sem avaliações</span>
                      )}
                      <span className="ml-auto text-forest text-sm font-medium opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all">ver mais →</span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
          {destinos.length === 0 && <p className="text-pine/40">Nenhum destino encontrado.</p>}
        </motion.div>
      )}
    </Page>
  );
}
