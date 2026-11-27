import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './context/auth';
import Inicio from './pages/Inicio';
import Resultados from './pages/Resultados';
import Impacto from './pages/Impacto';
import EcoTokens from './pages/EcoTokens';
import Destinos from './pages/Destinos';
import DestinoDetalhe from './pages/DestinoDetalhe';
import Viagens from './pages/Viagens';
import Mobilidade from './pages/Mobilidade';
import Rotas from './pages/Rotas';
import Login from './pages/Login';
import { Logo } from './components/Logo';

const navItens = [
  { to: '/', label: 'Recomendações', icon: '✨' },
  { to: '/resultados', label: 'Resultados', icon: '📊' },
  { to: '/impacto', label: 'Dados Reais', icon: '🌍' },
  { to: '/eco-tokens', label: 'EcoTokens', icon: '🪙' },
  { to: '/destinos', label: 'Destinos', icon: '🗺️' },
  { to: '/rotas', label: 'Planejar Rota', icon: '🧭' },
  { to: '/mobilidade', label: 'Mobilidade Verde', icon: '🚲' },
  { to: '/viagens', label: 'Minhas Viagens', icon: '✈️' },
];

function Hamburger({ aberto }: { aberto: boolean }) {
  const bar = 'absolute left-0 w-5 h-0.5 bg-white rounded';
  const t = { duration: 0.2 };
  return (
    <div className="relative w-5 h-[14px]">
      <motion.span className={bar} animate={{ top: aberto ? 6 : 0, rotate: aberto ? 45 : 0 }} transition={t} style={{ transformOrigin: 'center' }} />
      <motion.span className={bar} style={{ top: 6 }} animate={{ opacity: aberto ? 0 : 1 }} transition={t} />
      <motion.span className={bar} animate={{ top: aberto ? 6 : 12, rotate: aberto ? -45 : 0 }} transition={t} style={{ transformOrigin: 'center' }} />
    </div>
  );
}

function MenuItem({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <NavLink to={to} end={to === '/'}>
      {({ isActive }) => (
        <motion.div
          whileHover={{ x: 3 }}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
            isActive ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span className="text-base">{icon}</span>
          {label}
        </motion.div>
      )}
    </NavLink>
  );
}

function Shell() {
  const { usuario, sair } = useAuth();
  const loc = useLocation();
  const [aberto, setAberto] = useState(false);

  // Fecha o menu ao trocar de página ou ao entrar/sair.
  useEffect(() => { setAberto(false); }, [loc.pathname, usuario]);

  if (!usuario) return <Login />;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Barra superior: menu à esquerda, logo centralizado, usuário à direita */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 bg-200 animate-gradient-pan text-white shadow-md">
        <div className="relative max-w-6xl mx-auto h-16 flex items-center px-4">
          <button
            onClick={() => setAberto((v) => !v)}
            aria-label="Abrir menu"
            className="relative z-10 w-10 h-10 rounded-xl hover:bg-white/15 flex items-center justify-center transition"
          >
            <Hamburger aberto={aberto} />
          </button>

          <div className="absolute left-1/2 -translate-x-1/2">
            <Logo size={34} variant="light" animated={false} />
          </div>

          <div className="ml-auto relative z-10 flex items-center gap-2">
            <span className="hidden sm:block text-sm text-emerald-50/90">{usuario.nome.split(' ')[0]}</span>
            <div className="w-9 h-9 rounded-full bg-white/20 ring-1 ring-white/25 flex items-center justify-center font-bold">
              {usuario.nome.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Menu suspenso (guarda todas as opções) */}
      <AnimatePresence>
        {aberto && (
          <>
            <motion.div
              className="fixed inset-0 z-30 bg-black/20"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setAberto(false)}
            />
            <motion.nav
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="fixed z-40 top-[4.5rem] left-4 w-64 bg-white rounded-2xl shadow-2xl border border-black/5 p-2"
            >
              {navItens.map((n) => <MenuItem key={n.to} {...n} />)}
              <div className="border-t border-gray-100 my-2" />
              <div className="px-3 py-1.5">
                <p className="text-xs text-gray-400">Conectado como</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{usuario.nome}</p>
              </div>
              <button
                onClick={sair}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition"
              >
                Sair
              </button>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Conteúdo */}
      <main className="flex-1 p-4 md:p-8 lg:p-10 w-full max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          <Routes location={loc} key={loc.pathname}>
            <Route path="/" element={<Inicio />} />
            <Route path="/resultados" element={<Resultados />} />
            <Route path="/impacto" element={<Impacto />} />
            <Route path="/eco-tokens" element={<EcoTokens />} />
            <Route path="/destinos" element={<Destinos />} />
            <Route path="/destinos/:id" element={<DestinoDetalhe />} />
            <Route path="/rotas" element={<Rotas />} />
            <Route path="/mobilidade" element={<Mobilidade />} />
            <Route path="/viagens" element={<Viagens />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
