import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api';
import { useAuth } from '../context/auth';
import { useAsync } from '../hooks/useAsync';
import { Card, Loader, ErroBox, IndiceBadge, Estrelas, Page } from '../components';
import { Icon } from '../components/icons';
import { fadeUp } from '../lib/motion';

export default function DestinoDetalhe() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const { data: d, erro, recarregar } = useAsync(() => api.destino(Number(id)), [id]);
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState('');
  const [msg, setMsg] = useState('');

  async function avaliar(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      await api.criarAvaliacao({ id_usuario: usuario!.id_usuario, id_destino: Number(id), nota, comentario });
      setComentario('');
      setMsg('Avaliação enviada!');
      recarregar();
    } catch (err: any) {
      setMsg(err.message);
    }
  }

  if (erro) return <Page><ErroBox msg={erro} /></Page>;
  if (!d) return <Page><Loader linhas={4} /></Page>;

  return (
    <Page>
      <Link to="/destinos" className="text-sm text-forest hover:text-pine font-medium inline-flex items-center gap-1 group">
        <span className="group-hover:-translate-x-0.5 transition-transform">←</span> Voltar aos destinos
      </Link>

      <motion.div variants={fadeUp} className="flex flex-wrap justify-between items-start gap-3 mt-3 mb-5">
        <div>
          <h2 className="font-display text-2xl font-bold text-ink">{d.nome}</h2>
          <p className="text-pine/55 flex items-center gap-1.5 mt-0.5"><Icon name="map-pin" size={14} className="text-pine/40" />{d.cidade} · {d.estado} · {d.categoria}</p>
          <p className="text-ink/65 mt-2 max-w-2xl">{d.descricao}</p>
        </div>
        <div className="text-right">
          <IndiceBadge valor={d.indice_sustentabilidade} />
          <p className="text-xs text-pine/40 mt-2">Capacidade: {d.capacidade_maxima_diaria}/dia</p>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Hospedagens */}
        <Card className="p-5">
          <h3 className="font-display font-semibold text-ink mb-3 flex items-center gap-2"><Icon name="bed" size={18} className="text-forest" /> Hospedagens</h3>
          <div className="space-y-3">
            {d.hospedagens.map((h) => (
              <div key={h.id_hospedagem} className="border-b border-ink/[0.06] pb-3 last:border-0">
                <div className="flex justify-between">
                  <span className="font-medium text-ink">{h.hospedagem}</span>
                  <span className="text-forest font-semibold font-display">R$ {Number(h.preco_diaria).toFixed(0)}</span>
                </div>
                <div className="text-xs text-pine/50 flex flex-wrap gap-x-3 gap-y-1 mt-1.5 items-center">
                  <span>{h.tipo}</span>
                  {h.usa_energia_renovavel && <span className="text-forest inline-flex items-center gap-1"><Icon name="bolt" size={12} /> Energia renovável</span>}
                  {h.certificacoes && <span className="text-forest inline-flex items-center gap-1"><Icon name="check" size={12} /> {h.certificacoes}</span>}
                  <span className="inline-flex items-center gap-1"><Icon name="cloud" size={12} className="text-pine/40" /> {Number(h.pegada_carbono_diaria).toFixed(1)} kg CO₂/dia</span>
                </div>
              </div>
            ))}
            {d.hospedagens.length === 0 && <p className="text-pine/40 text-sm">Nenhuma hospedagem cadastrada.</p>}
          </div>
        </Card>

        {/* Atividades + práticas */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-display font-semibold text-ink mb-3 flex items-center gap-2"><Icon name="compass" size={18} className="text-forest" /> Atividades</h3>
            <div className="space-y-2">
              {d.atividades.map((a) => (
                <div key={a.id_atividade} className="flex justify-between text-sm">
                  <span className="text-ink/80">{a.nome}
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                      a.impacto_ambiental === 'BAIXO' ? 'bg-emerald-50 text-emerald-700' :
                      a.impacto_ambiental === 'MEDIO' ? 'bg-amber-50 text-amber-700' : 'bg-orange-50 text-orange-700'
                    }`}>impacto {a.impacto_ambiental.toLowerCase()}</span>
                  </span>
                  <span className="text-pine/50">{Number(a.preco) > 0 ? `R$ ${Number(a.preco).toFixed(0)}` : 'Grátis'}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-display font-semibold text-ink mb-3 flex items-center gap-2"><Icon name="leaf" size={18} className="text-forest" /> Práticas sustentáveis</h3>
            <div className="flex flex-wrap gap-2">
              {d.praticas.map((p, i) => (
                <span key={i} className="text-xs bg-leaf/10 text-forest px-2.5 py-1 rounded-full font-medium">
                  {p.nome}
                </span>
              ))}
              {d.praticas.length === 0 && <p className="text-pine/40 text-sm">Nenhuma registrada.</p>}
            </div>
          </Card>
        </div>
      </div>

      {/* Avaliações */}
      <Card className="p-5 mt-4">
        <h3 className="font-display font-semibold text-ink mb-3 flex items-center gap-2">
          <Icon name="star" size={18} className="text-amber-400" /> Avaliações {d.media_nota && <span className="text-sm font-normal text-pine/40">(média {Number(d.media_nota).toFixed(1)})</span>}
        </h3>

        <form onSubmit={avaliar} className="bg-sand/70 border border-ink/[0.05] rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm text-ink/70">Sua nota:</span>
            <select value={nota} onChange={(e) => setNota(Number(e.target.value))}
              className="border border-ink/[0.12] rounded-lg px-2 py-1 text-sm bg-white">
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
            </select>
          </div>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Conte sua experiência..."
            className="w-full border border-ink/[0.12] rounded-lg px-3 py-2 text-sm resize-none bg-white focus:ring-2 focus:ring-forest/40 focus:border-forest outline-none transition"
            rows={2}
          />
          <div className="flex items-center gap-3 mt-2">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
              className="bg-pine hover:bg-pine-600 text-white text-sm px-4 py-1.5 rounded-lg transition shadow-glow">
              Enviar avaliação
            </motion.button>
            {msg && (
              <motion.span key={msg} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                className="text-xs text-pine/50">{msg}</motion.span>
            )}
          </div>
        </form>

        <div className="space-y-3">
          {d.avaliacoes.map((a, i) => (
            <div key={i} className="border-b border-ink/[0.06] pb-3 last:border-0">
              <div className="flex justify-between">
                <span className="font-medium text-ink/80 text-sm">{a.usuario}</span>
                <Estrelas nota={a.nota} />
              </div>
              {a.comentario && <p className="text-sm text-ink/60 mt-1">{a.comentario}</p>}
            </div>
          ))}
          {d.avaliacoes.length === 0 && <p className="text-pine/40 text-sm">Seja o primeiro a avaliar.</p>}
        </div>
      </Card>
    </Page>
  );
}
