import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './context/auth';
import Login from './pages/Login';
import { Logo } from './components/Logo';
import { Icon, type IconName } from './components/icons';

// Telas carregadas sob demanda (code-splitting): cada uma vira um "pedaço"
// separado, baixado só quando o usuário abre aquela rota. Deixa o primeiro
// carregamento bem mais leve — importante no celular.
const Inicio = lazy(() => import('./pages/Inicio'));
const Resultados = lazy(() => import('./pages/Resultados'));
const Impacto = lazy(() => import('./pages/Impacto'));
const EcoTokens = lazy(() => import('./pages/EcoTokens'));
const Destinos = lazy(() => import('./pages/Destinos'));
const DestinoDetalhe = lazy(() => import('./pages/DestinoDetalhe'));
const Viagens = lazy(() => import('./pages/Viagens'));
const Mobilidade = lazy(() => import('./pages/Mobilidade'));
const Rotas = lazy(() => import('./pages/Rotas'));

const navItens: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Recomendações', icon: 'sparkles' },
  { to: '/resultados', label: 'Resultados', icon: 'dashboard' },
  { to: '/impacto', label: 'Dados Reais', icon: 'globe' },
  { to: '/eco-tokens', label: 'EcoTokens', icon: 'coin' },
  { to: '/destinos', label: 'Destinos', icon: 'map-pin' },
  { to: '/rotas', label: 'Planejar Rota', icon: 'compass' },
  { to: '/mobilidade', label: 'Mobilidade Verde', icon: 'bike' },
  { to: '/viagens', label: 'Minhas Viagens', icon: 'send' },
];

function NavItem({ to, label, icon, onClick }: { to: string; label: string; icon: IconName; onClick?: () => void }) {
  return (
    <NavLink to={to} end={to === '/'} onClick={onClick}>
      {({ isActive }) => (
        <motion.div
          whileHover={{ x: isActive ? 0 : 3 }}
          className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            isActive ? 'bg-leaf/12 text-pine' : 'text-pine/60 hover:bg-pine/[0.05] hover:text-pine'
          }`}
        >
          {isActive && (
            <motion.span layoutId="nav-ind" className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-full bg-gradient-to-b from-leaf to-forest" />
          )}
          <Icon name={icon} size={19} strokeWidth={isActive ? 1.9 : 1.7} />
          {label}
        </motion.div>
      )}
    </NavLink>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {navItens.map((n) => <NavItem key={n.to} {...n} onClick={onNavigate} />)}
    </nav>
  );
}

function UserFooter() {
  const { usuario, sair } = useAuth();
  if (!usuario) return null;
  return (
    <div className="mt-auto pt-3">
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/60 border border-ink/[0.06]">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-forest to-pine text-sprout font-display font-bold flex items-center justify-center shrink-0">
          {usuario.nome.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-pine/50">Conectado como</p>
          <p className="text-sm font-semibold text-ink truncate">{usuario.nome}</p>
        </div>
        <button
          onClick={sair}
          aria-label="Sair"
          className="w-8 h-8 rounded-lg text-pine/50 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors shrink-0"
        >
          <Icon name="logout" size={17} />
        </button>
      </div>
    </div>
  );
}

/** Placeholder leve enquanto o "pedaço" da tela baixa. */
function RouteFallback() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      <div className="skeleton h-9 w-72 rounded-lg" />
      <div className="skeleton h-40 w-full rounded-2xl" />
      <div className="skeleton h-40 w-full rounded-2xl" />
    </div>
  );
}

function Shell() {
  const { usuario } = useAuth();
  const loc = useLocation();
  const [aberto, setAberto] = useState(false);

  // Fecha o drawer ao trocar de página ou ao entrar/sair.
  useEffect(() => { setAberto(false); }, [loc.pathname, usuario]);

  if (!usuario) return <Login />;

  const pageAtual = navItens.find((n) => (n.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(n.to)))?.label ?? 'EcoViagem';

  return (
    <div className="min-h-screen">
      {/* Sidebar fixa (desktop) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col bg-white/70 backdrop-blur-xl border-r border-ink/[0.06] px-4 py-5 z-40">
        <div className="px-1.5 mb-6">
          <Logo size={34} variant="dark" animated={false} />
        </div>
        <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-pine/40">Navegação</p>
        <NavList />
        <UserFooter />
      </aside>

      {/* Drawer (mobile) */}
      <AnimatePresence>
        {aberto && (
          <>
            <motion.div
              className="lg:hidden fixed inset-0 z-40 bg-pine/20 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setAberto(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="lg:hidden fixed inset-y-0 left-0 w-[264px] z-50 flex flex-col bg-sand/95 backdrop-blur-xl border-r border-ink/[0.08] px-4 py-5 shadow-2xl overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6 px-1.5">
                <Logo size={32} variant="dark" animated={false} />
                <button onClick={() => setAberto(false)} aria-label="Fechar menu"
                  className="w-9 h-9 rounded-lg text-pine/50 hover:bg-pine/[0.06] flex items-center justify-center">
                  <Icon name="close" size={18} />
                </button>
              </div>
              <NavList onNavigate={() => setAberto(false)} />
              <UserFooter />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Coluna de conteúdo */}
      <div className="lg:pl-60">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-sand/80 backdrop-blur-xl border-b border-ink/[0.06]">
          <div className="h-16 flex items-center gap-3 px-4 md:px-8">
            <button
              onClick={() => setAberto(true)}
              aria-label="Abrir menu"
              className="lg:hidden w-10 h-10 rounded-xl text-pine/70 hover:bg-pine/[0.06] flex items-center justify-center transition-colors"
            >
              <Icon name="menu" size={20} />
            </button>

            <div className="lg:hidden">
              <Logo size={30} variant="dark" animated={false} />
            </div>

            <h1 className="hidden lg:block font-display text-lg font-bold text-ink">{pageAtual}</h1>

            <div className="ml-auto flex items-center gap-2">
              <button aria-label="Notificações"
                className="relative w-10 h-10 rounded-xl border border-ink/[0.07] bg-white/70 text-pine/60 hover:text-pine flex items-center justify-center transition-colors">
                <Icon name="bell" size={18} />
                <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-clay ring-2 ring-sand" />
              </button>
              <div className="hidden sm:flex items-center gap-2.5 pl-1">
                <span className="text-sm text-pine/70 font-medium">{usuario.nome.split(' ')[0]}</span>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-forest to-pine text-sprout font-display font-bold flex items-center justify-center">
                  {usuario.nome.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="p-4 md:p-8 lg:p-10 w-full max-w-6xl mx-auto">
          <Suspense fallback={<RouteFallback />}>
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
          </Suspense>
        </main>
      </div>
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
