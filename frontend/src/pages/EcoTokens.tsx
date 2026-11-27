import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';
import type { AcaoSustentavel, Recompensa, Resgate } from '../types';
import { Card, PageTitle, Loader, ErroBox, Page } from '../components';
import { fadeUp, stagger, useCountUp } from '../lib/motion';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../context/auth';

const fmt = (n: number, d = 0) => n.toLocaleString('pt-BR', { maximumFractionDigits: d });
const TIPOS: Record<string, string> = {
  VIAGEM: 'Viagens', HOSPEDAGEM: 'Hospedagens', EXPERIENCIA: 'Experiências', DESCONTO: 'Descontos', DOACAO: 'Doações',
};

export default function EcoTokens() {
  const { usuario } = useAuth();
  const id = usuario!.id_usuario;
  const [aba, setAba] = useState<'relatar' | 'loja' | 'historico'>('relatar');
  const [toast, setToast] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null);
  const [voucher, setVoucher] = useState<Resgate | null>(null);

  const { data, loading, erro, recarregar } = useAsync(async () => {
    const [acoes, carteira, recompensas, ranking] = await Promise.all([
      api.ecoAcoes(id), api.ecoCarteira(id), api.ecoRecompensas(), api.ecoRanking(),
    ]);
    return { acoes, carteira, recompensas, ranking };
  }, [id]);

  function avisar(tipo: 'ok' | 'erro', msg: string) {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 3500);
  }

  if (erro) return <Page><ErroBox msg={`Falha ao carregar: ${erro}`} /></Page>;
  if (loading && !data) return <Page><Loader linhas={4} /></Page>;
  if (!data) return null;
  const { acoes, carteira, recompensas, ranking } = data;
  const saldo = Number(carteira.saldo.saldo);

  return (
    <Page>
      <PageTitle title="EcoTokens" subtitle="Relate suas práticas sustentáveis, ganhe tokens e troque por viagens e descontos" />

      <Carteira saldo={saldo} ganhos={Number(carteira.saldo.tokens_ganhos)} acoes={Number(carteira.saldo.qtd_acoes)}
        co2={Number(carteira.saldo.co2_evitado_kg)} />

      <div className="flex gap-1 bg-white/70 rounded-xl p-1 ring-1 ring-black/5 w-fit mb-5 mt-6">
        {([['relatar', '🌱 Relatar prática'], ['loja', '🎁 Trocar tokens'], ['historico', '📜 Histórico']] as const).map(([k, r]) => (
          <button key={k} onClick={() => setAba(k)}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${aba === k ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>
            {r}
          </button>
        ))}
      </div>

      {aba === 'relatar' && (
        <Relatar acoes={acoes} idUsuario={id}
          onOk={(ganho) => { avisar('ok', `+${ganho} EcoTokens! Obrigado por cuidar do planeta 🌍`); recarregar(); }}
          onErro={(m) => avisar('erro', m)} />
      )}
      {aba === 'loja' && (
        <Loja recompensas={recompensas} saldo={saldo} idUsuario={id}
          onOk={(r) => { setVoucher(r); recarregar(); }}
          onErro={(m) => avisar('erro', m)} />
      )}
      {aba === 'historico' && <Historico carteira={carteira} ranking={ranking} />}

      {/* Toast */}
      {createPortal(
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-medium ${toast.tipo === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* Voucher do resgate */}
      {createPortal(
        <AnimatePresence>
          {voucher && (
            <motion.div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setVoucher(null)}>
              <motion.div initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
                <div className="text-5xl">{voucher.icone}</div>
                <h3 className="text-lg font-extrabold text-gray-900 mt-2">Resgate confirmado!</h3>
                <p className="text-sm text-gray-600 mt-1">{voucher.recompensa}</p>
                <div className="mt-4 border-2 border-dashed border-emerald-300 bg-emerald-50 rounded-xl py-3">
                  <p className="text-[11px] text-emerald-700 uppercase tracking-wide font-semibold">Código do voucher</p>
                  <p className="text-2xl font-mono font-extrabold tracking-widest text-emerald-800 select-all">{voucher.codigo_voucher}</p>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Apresente o código {voucher.parceiro ? <>em <strong>{voucher.parceiro}</strong></> : 'ao parceiro'}. Ele fica salvo no seu histórico.
                </p>
                <button onClick={() => setVoucher(null)} className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl transition">
                  Fechar
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </Page>
  );
}

/* --------------------------------------------------------------------------- */

function Carteira({ saldo, ganhos, acoes, co2 }: { saldo: number; ganhos: number; acoes: number; co2: number }) {
  const s = useCountUp(saldo);
  const proximoNivel = [100, 300, 700, 1500, 3000].find((n) => ganhos < n) ?? ganhos;
  const nivel = ['🌱 Semente', '🌿 Broto', '🌳 Árvore', '🌲 Floresta', '🌍 Guardião', '🦸 Lenda verde'][[100, 300, 700, 1500, 3000].filter((n) => ganhos >= n).length];
  const pct = proximoNivel === ganhos ? 100 : (ganhos / proximoNivel) * 100;
  return (
    <motion.div variants={fadeUp}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-emerald-500 to-teal-700 text-white p-6 shadow-lg shadow-emerald-800/20">
      <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
      <div className="relative grid sm:grid-cols-4 gap-4 items-center">
        <div className="sm:col-span-2">
          <p className="text-xs uppercase tracking-wide font-semibold text-white/80">Saldo disponível</p>
          <p className="text-4xl md:text-5xl font-extrabold tabular-nums">🪙 {s}</p>
          <p className="text-sm text-white/90 mt-1">Nível: <strong>{nivel}</strong></p>
          <div className="mt-2 h-2 bg-white/25 rounded-full overflow-hidden max-w-xs">
            <motion.div className="h-2 bg-white rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.9 }} />
          </div>
          {proximoNivel !== ganhos && <p className="text-[11px] text-white/80 mt-1">{fmt(proximoNivel - ganhos)} tokens para o próximo nível</p>}
        </div>
        <Mini rotulo="Práticas relatadas" valor={fmt(acoes)} />
        <Mini rotulo="CO₂ evitado (estim.)" valor={`${fmt(co2, 1)} kg`} />
      </div>
    </motion.div>
  );
}

function Mini({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="bg-white/15 ring-1 ring-white/20 rounded-2xl p-3">
      <p className="text-2xl font-extrabold tabular-nums">{valor}</p>
      <p className="text-xs text-white/85">{rotulo}</p>
    </div>
  );
}

/* --------------------------------------------------------------------------- */

function Relatar({ acoes, idUsuario, onOk, onErro }: {
  acoes: AcaoSustentavel[]; idUsuario: number; onOk: (ganho: number) => void; onErro: (m: string) => void;
}) {
  const [aberta, setAberta] = useState<number | null>(null);
  const [descricao, setDescricao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const categorias = [...new Set(acoes.map((a) => a.categoria))];

  async function enviar(a: AcaoSustentavel) {
    setEnviando(true);
    try {
      await api.ecoRegistrar({ id_usuario: idUsuario, id_acao: a.id_acao, descricao: descricao.trim() || undefined });
      setAberta(null); setDescricao('');
      onOk(a.tokens);
    } catch (e: any) {
      onErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-6">
      {categorias.map((cat) => (
        <div key={cat}>
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{cat}</h4>
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {acoes.filter((a) => a.categoria === cat).map((a) => {
              const esgotada = (a.usos_hoje ?? 0) >= a.limite_diario;
              const open = aberta === a.id_acao;
              return (
                <motion.div key={a.id_acao} variants={fadeUp}
                  className={`rounded-2xl border p-4 transition ${open ? 'border-emerald-400 bg-emerald-50/50 shadow-md' : 'border-black/5 bg-white/90'} ${esgotada ? 'opacity-60' : ''}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{a.icone}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm leading-tight">{a.nome}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{a.descricao}</p>
                    </div>
                    <span className="shrink-0 text-sm font-extrabold text-amber-600">+{a.tokens}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[11px] text-gray-400">Hoje: {a.usos_hoje ?? 0}/{a.limite_diario}</span>
                    {esgotada ? (
                      <span className="text-[11px] font-semibold text-gray-500">Volte amanhã ✓</span>
                    ) : !open ? (
                      <button onClick={() => { setAberta(a.id_acao); setDescricao(''); }}
                        className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition">
                        Relatar
                      </button>
                    ) : null}
                  </div>
                  <AnimatePresence>
                    {open && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={500} rows={2}
                          placeholder="Conte rapidinho o que você fez (opcional)"
                          className="mt-3 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => setAberta(null)} className="flex-1 text-xs font-medium py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600">Cancelar</button>
                          <button disabled={enviando} onClick={() => enviar(a)}
                            className="flex-1 text-xs font-semibold py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60">
                            {enviando ? 'Enviando…' : `Confirmar +${a.tokens}`}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      ))}
      <p className="text-xs text-gray-400">
        Cada prática tem um limite diário, controlado por uma trigger no banco de dados, para manter o sistema justo.
      </p>
    </div>
  );
}

/* --------------------------------------------------------------------------- */

function Loja({ recompensas, saldo, idUsuario, onOk, onErro }: {
  recompensas: Recompensa[]; saldo: number; idUsuario: number; onOk: (r: Resgate) => void; onErro: (m: string) => void;
}) {
  const [filtro, setFiltro] = useState('');
  const [confirmar, setConfirmar] = useState<Recompensa | null>(null);
  const [enviando, setEnviando] = useState(false);
  const lista = recompensas.filter((r) => !filtro || r.tipo === filtro);

  async function resgatar(r: Recompensa) {
    setEnviando(true);
    try {
      const res = await api.ecoResgatar({ id_usuario: idUsuario, id_recompensa: r.id_recompensa });
      setConfirmar(null);
      onOk(res);
    } catch (e: any) {
      onErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setFiltro('')} className={`px-3 py-1.5 rounded-full text-xs font-medium ${!filtro ? 'bg-emerald-600 text-white' : 'bg-white ring-1 ring-gray-200 text-gray-600'}`}>Todas</button>
        {Object.entries(TIPOS).map(([k, v]) => (
          <button key={k} onClick={() => setFiltro(k)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${filtro === k ? 'bg-emerald-600 text-white' : 'bg-white ring-1 ring-gray-200 text-gray-600'}`}>{v}</button>
        ))}
      </div>
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {lista.map((r) => {
          const falta = r.custo_tokens - saldo;
          const pode = falta <= 0 && r.estoque > 0;
          return (
            <motion.div key={r.id_recompensa} variants={fadeUp} whileHover={{ y: -4 }}
              className="bg-white/90 rounded-2xl border border-black/5 shadow-[0_2px_14px_-8px_rgba(16,40,31,0.25)] p-4 flex flex-col">
              <div className="flex items-start justify-between">
                <span className="text-3xl">{r.icone}</span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{TIPOS[r.tipo] ?? r.tipo}</span>
              </div>
              <p className="font-bold text-gray-900 mt-2 leading-tight">{r.nome}</p>
              <p className="text-xs text-gray-500 mt-1 flex-1">{r.descricao}</p>
              {(r.parceiro || r.destino) && (
                <p className="text-[11px] text-gray-400 mt-2">{r.parceiro}{r.destino ? ` · ${r.destino}` : ''}</p>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-lg font-extrabold text-amber-600">🪙 {fmt(r.custo_tokens)}</span>
                <button disabled={!pode} onClick={() => setConfirmar(r)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-gray-100 disabled:text-gray-400">
                  {r.estoque <= 0 ? 'Esgotado' : pode ? 'Trocar' : `Faltam ${fmt(falta)}`}
                </button>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {createPortal(
        <AnimatePresence>
          {confirmar && (
            <motion.div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !enviando && setConfirmar(null)}>
              <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                <p className="text-4xl text-center">{confirmar.icone}</p>
                <h3 className="text-lg font-bold text-gray-900 text-center mt-2">Trocar tokens?</h3>
                <p className="text-sm text-gray-600 text-center mt-1">{confirmar.nome}</p>
                <div className="flex justify-between text-sm mt-4 bg-gray-50 rounded-xl p-3">
                  <span className="text-gray-500">Saldo após a troca</span>
                  <span className="font-bold text-gray-900">🪙 {fmt(saldo - confirmar.custo_tokens)}</span>
                </div>
                <div className="flex gap-2 mt-4">
                  <button disabled={enviando} onClick={() => setConfirmar(null)} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium">Cancelar</button>
                  <button disabled={enviando} onClick={() => resgatar(confirmar)} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60">
                    {enviando ? 'Trocando…' : `Trocar ${fmt(confirmar.custo_tokens)}`}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

/* --------------------------------------------------------------------------- */

const MODO_ICONE: Record<string, string> = {
  A_PE: '🚶', BICICLETA: '🚲', TREM: '🚇', ONIBUS: '🚌', VAN: '🚐', CARONA: '🧑‍🤝‍🧑', CARRO: '🚗', AVIAO: '✈️',
};

function Historico({ carteira, ranking }: {
  carteira: { registros: any[]; rotas?: any[]; resgates: Resgate[] };
  ranking: { nome: string; tokens_ganhos: number; qtd_acoes: number }[];
}) {
  const data = (s: string) => new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="p-5 lg:col-span-2">
        <h3 className="font-semibold text-gray-800 mb-3">Movimentações</h3>
        {carteira.resgates.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Vouchers resgatados</p>
            <div className="space-y-2">
              {carteira.resgates.map((r) => (
                <div key={r.id_resgate} className="flex items-center gap-3 bg-amber-50/60 rounded-xl px-3 py-2">
                  <span className="text-xl">{r.icone}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{r.recompensa}</p>
                    <p className="text-[11px] text-gray-500 font-mono">{r.codigo_voucher} · {data(r.data_resgate)}</p>
                  </div>
                  <span className="text-sm font-bold text-red-500">−{fmt(r.tokens_gastos)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {carteira.rotas && carteira.rotas.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Rotas sustentáveis</p>
            <div className="space-y-1.5">
              {carteira.rotas.map((r) => (
                <div key={r.id_rota} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50">
                  <span className="text-xl">{MODO_ICONE[r.modo] ?? '🧭'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{r.origem} → {r.destino}</p>
                    <p className="text-[11px] text-gray-500">{fmt(Number(r.distancia_km))} km · evitou {fmt(Number(r.co2_evitado_kg), 1)} kg de CO₂</p>
                  </div>
                  <span className="text-[11px] text-gray-400 shrink-0">{data(r.data_registro)}</span>
                  <span className="text-sm font-bold text-emerald-600 w-12 text-right">+{r.tokens}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Práticas relatadas</p>
        <div className="space-y-1.5">
          {carteira.registros.map((r) => (
            <div key={r.id_registro} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50">
              <span className="text-xl">{r.icone}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{r.acao}</p>
                {r.descricao && <p className="text-[11px] text-gray-500 truncate">{r.descricao}</p>}
              </div>
              <span className="text-[11px] text-gray-400 shrink-0">{data(r.data_registro)}</span>
              <span className="text-sm font-bold text-emerald-600 w-12 text-right">+{r.tokens_ganhos}</span>
            </div>
          ))}
          {carteira.registros.length === 0 && <p className="text-sm text-gray-400">Você ainda não relatou nenhuma prática.</p>}
        </div>
      </Card>
      <Card className="p-5">
        <h3 className="font-semibold text-gray-800 mb-3">🏆 Ranking da comunidade</h3>
        <ol className="space-y-2">
          {ranking.map((r, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-300 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
              <span className="flex-1 text-sm text-gray-700">{r.nome}</span>
              <span className="text-sm font-bold text-amber-600">{fmt(Number(r.tokens_ganhos))}</span>
            </li>
          ))}
          {ranking.length === 0 && <p className="text-sm text-gray-400">Seja o primeiro!</p>}
        </ol>
      </Card>
    </div>
  );
}
