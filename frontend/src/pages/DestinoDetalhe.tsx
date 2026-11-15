import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api';
import { useAuth } from '../context/auth';
import { useAsync } from '../hooks/useAsync';
import { Card, Loader, ErroBox, IndiceBadge, Estrelas, Page } from '../components';
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
      <Link to="/destinos" className="text-sm text-emerald-700 hover:underline inline-flex items-center gap-1 group">
        <span className="group-hover:-translate-x-0.5 transition-transform">←</span> Voltar aos destinos
      </Link>

      <motion.div variants={fadeUp} className="flex flex-wrap justify-between items-start gap-3 mt-3 mb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{d.nome}</h2>
          <p className="text-gray-500">{d.cidade} · {d.estado} · {d.categoria}</p>
          <p className="text-gray-600 mt-2 max-w-2xl">{d.descricao}</p>
        </div>
        <div className="text-right">
          <IndiceBadge valor={d.indice_sustentabilidade} />
          <p className="text-xs text-gray-400 mt-2">Capacidade: {d.capacidade_maxima_diaria}/dia</p>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Hospedagens */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-800 mb-3">🏨 Hospedagens</h3>
          <div className="space-y-3">
            {d.hospedagens.map((h) => (
              <div key={h.id_hospedagem} className="border-b border-gray-100 pb-3 last:border-0">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-800">{h.hospedagem}</span>
                  <span className="text-emerald-700 font-semibold">R$ {Number(h.preco_diaria).toFixed(0)}</span>
                </div>
                <div className="text-xs text-gray-500 flex flex-wrap gap-2 mt-1">
                  <span>{h.tipo}</span>
                  {h.usa_energia_renovavel && <span className="text-emerald-600">⚡ Energia renovável</span>}
                  {h.certificacoes && <span className="text-emerald-600">✓ {h.certificacoes}</span>}
                  <span>💨 {Number(h.pegada_carbono_diaria).toFixed(1)} kg CO₂/dia</span>
                </div>
              </div>
            ))}
            {d.hospedagens.length === 0 && <p className="text-gray-400 text-sm">Nenhuma hospedagem cadastrada.</p>}
          </div>
        </Card>

        {/* Atividades + práticas */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold text-gray-800 mb-3">🥾 Atividades</h3>
            <div className="space-y-2">
              {d.atividades.map((a) => (
                <div key={a.id_atividade} className="flex justify-between text-sm">
                  <span className="text-gray-700">{a.nome}
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                      a.impacto_ambiental === 'BAIXO' ? 'bg-emerald-50 text-emerald-700' :
                      a.impacto_ambiental === 'MEDIO' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                    }`}>impacto {a.impacto_ambiental.toLowerCase()}</span>
                  </span>
                  <span className="text-gray-500">{Number(a.preco) > 0 ? `R$ ${Number(a.preco).toFixed(0)}` : 'Grátis'}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-gray-800 mb-3">🌿 Práticas sustentáveis</h3>
            <div className="flex flex-wrap gap-2">
              {d.praticas.map((p, i) => (
                <span key={i} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">
                  {p.nome}
                </span>
              ))}
              {d.praticas.length === 0 && <p className="text-gray-400 text-sm">Nenhuma registrada.</p>}
            </div>
          </Card>
        </div>
      </div>

      {/* Avaliações */}
      <Card className="p-5 mt-4">
        <h3 className="font-semibold text-gray-800 mb-3">
          ⭐ Avaliações {d.media_nota && <span className="text-sm text-gray-400">(média {Number(d.media_nota).toFixed(1)})</span>}
        </h3>

        <form onSubmit={avaliar} className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm text-gray-600">Sua nota:</span>
            <select value={nota} onChange={(e) => setNota(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm">
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
            </select>
          </div>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Conte sua experiência..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
            rows={2}
          />
          <div className="flex items-center gap-3 mt-2">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-1.5 rounded-lg transition">
              Enviar avaliação
            </motion.button>
            {msg && (
              <motion.span key={msg} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                className="text-xs text-gray-500">{msg}</motion.span>
            )}
          </div>
        </form>

        <div className="space-y-3">
          {d.avaliacoes.map((a, i) => (
            <div key={i} className="border-b border-gray-100 pb-3 last:border-0">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700 text-sm">{a.usuario}</span>
                <Estrelas nota={a.nota} />
              </div>
              {a.comentario && <p className="text-sm text-gray-600 mt-1">{a.comentario}</p>}
            </div>
          ))}
          {d.avaliacoes.length === 0 && <p className="text-gray-400 text-sm">Seja o primeiro a avaliar.</p>}
        </div>
      </Card>
    </Page>
  );
}
